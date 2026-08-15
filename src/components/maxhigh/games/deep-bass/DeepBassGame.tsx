/**
 * Deep Bass arena — continuous-fire fish hunter shell.
 * Spawns are server-owned; client only renders live fish from syncSpawns. Shots settle server-side.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Fish, Snowflake, Target, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  DEEP_BASS_GAME_ID,
  getWeapon,
  type DeepBassConfig,
  type FishTierId,
  type PowerUpId,
  type WeaponTierId,
} from "@/lib/deep-bass-config";
import {
  deepBassBossStatusFn,
  deepBassSyncSpawnsFn,
  deepBassBuyPowerUpFn,
  deepBassEnsureSessionFn,
  deepBassFireShotFn,
  deepBassSetWeaponFn,
  deepBassUseFreezeLureFn,
  deepBassUseNetBombFn,
  getDeepBassEngineConfigFn,
} from "@/functions/deep-bass";
import { cn } from "@/lib/utils";
import {
  CANNON_MOUNT,
  clamp,
  dist2,
  estimateFishAim,
  isOnScreen,
  leadFishAim,
  type AimPoint,
} from "./aim";
import { DEEP_BASS_ASSET, pathAmpFor, SWIM, TIMING } from "./animationConfig";
import { playDeepBassSound, setDeepBassMuted, unlockDeepBassAudio } from "./audio";
import { BoatCannon, type CannonImpact, type CannonShot } from "./BoatCannon";
import { FishSprite } from "./FishSprite";
import { getDeepBassConfig, setDeepBassConfig } from "./runtimeConfig";
import type { ArenaFish } from "./types";

const TIER_AUTO_PRIORITY: FishTierId[] = [
  "boss",
  "super",
  "elite",
  "rare",
  "crate",
  "uncommon",
  "common",
];

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

type Banner = { label: string; credit: number; tierId: FishTierId } | null;

function formatPhp(n: number) {
  return `₱${n.toFixed(2)}`;
}

function makeBossFish(opts: {
  instanceId: string;
  hitsTaken: number;
  hitsRequired: number;
  payoutMult: number;
  fromLeft?: boolean;
}): ArenaFish {
  return {
    instanceId: opts.instanceId,
    tierId: "boss",
    hitsTaken: opts.hitsTaken,
    hitsRequired: opts.hitsRequired,
    payoutMult: opts.payoutMult,
    y: opts.fromLeft === undefined ? 40 : 38,
    fromLeft: opts.fromLeft ?? true,
    path: "wave",
    speedMs: SWIM.durationMs.boss,
    size: 260,
    frozenUntil: 0,
    createdAt: Date.now(),
  };
}

function playKillSfx(tierId: FishTierId) {
  if (tierId === "boss") playDeepBassSound("bossDeath");
  else if (tierId === "super" || tierId === "elite" || tierId === "rare") {
    playDeepBassSound("fishDeathLarge");
  } else if (tierId === "crate") playDeepBassSound("crateDrop");
  else playDeepBassSound("fishDeathSmall");
}

export function DeepBassGame({
  gameId = DEEP_BASS_GAME_ID,
  gameName = "Deep Bass",
  onBalance,
}: Props) {
  void gameId;
  const [cfg, setCfg] = useState<DeepBassConfig>(() => getDeepBassConfig());
  const [balance, setBalance] = useState<number | null>(null);
  const [weaponId, setWeaponId] = useState<WeaponTierId>("bamboo");
  const [fish, setFish] = useState<ArenaFish[]>([]);
  const [firing, setFiring] = useState(false);
  const [muted, setMuted] = useState(false);
  const [goldenHookMult, setGoldenHookMult] = useState(1);
  const [powerUps, setPowerUps] = useState<Partial<Record<PowerUpId, number>>>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [bossHud, setBossHud] = useState<{
    hitsTaken: number;
    hitsRequired: number;
    expiresAt: number;
  } | null>(null);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [shots, setShots] = useState<CannonShot[]>([]);
  const [impacts, setImpacts] = useState<CannonImpact[]>([]);
  const [hitFlashId, setHitFlashId] = useState<string | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const inflightRef = useRef(0);
  const lastFireAtRef = useRef(0);
  const autoFireRef = useRef(false);
  const aimRef = useRef<AimPoint | null>(null);
  const fishRef = useRef<ArenaFish[]>([]);
  const fishElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const bannerTimerRef = useRef<number | null>(null);
  const balanceRef = useRef<number | null>(null);
  const weaponIdRef = useRef<WeaponTierId>(weaponId);
  const [autoFire, setAutoFire] = useState(false);

  useEffect(() => {
    aimRef.current = aim;
  }, [aim]);

  useEffect(() => {
    fishRef.current = fish;
  }, [fish]);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    weaponIdRef.current = weaponId;
  }, [weaponId]);

  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  const showBanner = useCallback((next: Banner) => {
    if (bannerTimerRef.current != null) window.clearTimeout(bannerTimerRef.current);
    setBanner(next);
    if (!next) return;
    bannerTimerRef.current = window.setTimeout(() => {
      setBanner(null);
      bannerTimerRef.current = null;
    }, TIMING.bannerMs);
  }, []);

  const readFishDomAim = useCallback((instanceId: string): AimPoint | null => {
    const arena = arenaRef.current;
    const el = fishElsRef.current.get(instanceId);
    if (!arena || !el) return null;
    const a = arena.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (a.width <= 0 || a.height <= 0) return null;
    const x = ((r.left + r.width / 2 - a.left) / a.width) * 100;
    const y = ((r.top + r.height / 2 - a.top) / a.height) * 100;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < -5 || x > 105 || y < -5 || y > 105) return null;
    return { x: clamp(x, 2, 98), y: clamp(y, 8, 82) };
  }, []);

  const aimAtFish = useCallback(
    (target: ArenaFish, leadMs: number = TIMING.shotTravelMs): AimPoint => {
      const live = readFishDomAim(target.instanceId);
      if (live) return leadFishAim(live, target, leadMs);
      return estimateFishAim(target, leadMs);
    },
    [readFishDomAim],
  );

  const syncBalance = useCallback(
    (n: number) => {
      setBalance(n);
      onBalance?.(n);
    },
    [onBalance],
  );

  useEffect(() => {
    unlockDeepBassAudio();
    let cancelled = false;
    void (async () => {
      const [remote, sessionResult] = await Promise.all([
        getDeepBassEngineConfigFn().catch(() => null),
        deepBassEnsureSessionFn({ data: { weaponId: "bamboo" } }).then(
          (s) => ({ ok: true as const, s }),
          (e: unknown) => ({ ok: false as const, e }),
        ),
      ]);
      if (cancelled) return;

      if (remote) {
        setDeepBassConfig(remote);
        setCfg(remote);
      } else {
        setCfg(getDeepBassConfig());
      }

      if (!sessionResult.ok) {
        toast.error(
          sessionResult.e instanceof Error
            ? sessionResult.e.message
            : "Failed to open session",
        );
        return;
      }
      const session = sessionResult.s;
      if (session.weaponId) setWeaponId(session.weaponId);
      setGoldenHookMult(session.goldenHookMult ?? 1);
      setPowerUps(session.powerUps ?? {});
      syncBalance(session.balance);
      if (session.config) {
        setDeepBassConfig(session.config);
        setCfg(session.config);
      }
      if (session.boss?.active) {
        setBossHud({
          hitsTaken: session.boss.hitsTaken,
          hitsRequired: session.boss.hitsRequired,
          expiresAt: session.boss.expiresAt,
        });
        setFish((prev) => {
          if (prev.some((f) => f.tierId === "boss")) return prev;
          return [
            ...prev,
            makeBossFish({
              instanceId: session.boss!.instanceId,
              hitsTaken: session.boss!.hitsTaken,
              hitsRequired: session.boss!.hitsRequired,
              payoutMult: session.boss!.payoutMult,
            }),
          ];
        });
      }
    })();
    return () => {
      cancelled = true;
      if (bannerTimerRef.current != null) window.clearTimeout(bannerTimerRef.current);
    };
  }, [syncBalance]);

  // Server-owned fish spawns — sync live list; never invent tier/instance locally.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await deepBassSyncSpawnsFn();
        if (cancelled) return;
        setFish((prev) => {
          const dying = prev.filter((f) => f.dying);
          const boss = prev.filter((f) => f.tierId === "boss" && !f.dying);
          const localFreeze = new Map(prev.map((f) => [f.instanceId, f.frozenUntil] as const));
          const fromServer = res.fish.map((f) => ({
            instanceId: f.instanceId,
            tierId: f.tierId,
            hitsTaken: f.hitsTaken,
            hitsRequired: f.hitsRequired,
            payoutMult: f.payoutMult,
            y: f.y,
            fromLeft: f.fromLeft,
            path: f.path as ArenaFish["path"],
            speedMs: f.speedMs,
            size: f.size,
            createdAt: f.createdAt,
            frozenUntil: Math.max(f.frozenUntil ?? 0, localFreeze.get(f.instanceId) ?? 0),
          }));
          const dyingKeep = dying.filter(
            (d) => !fromServer.some((s) => s.instanceId === d.instanceId),
          );
          return [...fromServer, ...boss, ...dyingKeep];
        });
      } catch {
        // keep last frame on transient sync errors
      }
    };
    const id = window.setInterval(() => void tick(), Math.max(400, cfg.spawnIntervalSec * 1000));
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [cfg]);

  // Boss poll (low frequency — boss state also updates on shots)
  useEffect(() => {
    const id = window.setInterval(() => {
      void deepBassBossStatusFn()
        .then((res) => {
          if (res.boss?.active) {
            setBossHud({
              hitsTaken: res.boss.hitsTaken,
              hitsRequired: res.boss.hitsRequired,
              expiresAt: res.boss.expiresAt,
            });
            setFish((prev) => {
              if (prev.some((f) => f.instanceId === res.boss!.instanceId)) {
                return prev.map((f) =>
                  f.instanceId === res.boss!.instanceId
                    ? {
                        ...f,
                        hitsTaken: res.boss!.hitsTaken,
                        hitsRequired: res.boss!.hitsRequired,
                        payoutMult: res.boss!.payoutMult,
                      }
                    : f,
                );
              }
              playDeepBassSound("bossRoar");
              return [
                ...prev.filter((f) => f.tierId !== "boss"),
                makeBossFish({
                  instanceId: res.boss!.instanceId,
                  hitsTaken: res.boss!.hitsTaken,
                  hitsRequired: res.boss!.hitsRequired,
                  payoutMult: res.boss!.payoutMult,
                  fromLeft: Math.random() > 0.5,
                }),
              ];
            });
          } else {
            setBossHud(null);
            setFish((prev) =>
              prev.some((f) => f.tierId === "boss")
                ? prev.filter((f) => f.tierId !== "boss")
                : prev,
            );
          }
        })
        .catch(() => undefined);
    }, TIMING.bossPollMs);
    return () => window.clearInterval(id);
  }, []);

  const weapon = getWeapon(cfg, weaponId);

  const removeFish = useCallback((instanceId: string) => {
    setFish((prev) =>
      prev.map((f) => (f.instanceId === instanceId ? { ...f, dying: true } : f)),
    );
    window.setTimeout(() => {
      setFish((prev) => prev.filter((f) => f.instanceId !== instanceId));
      fishElsRef.current.delete(instanceId);
    }, SWIM.deathMs);
  }, []);

  const fireAt = useCallback(
    async (target: ArenaFish) => {
      if (target.dying) return;
      const now = performance.now();
      if (inflightRef.current >= TIMING.maxInflightShots) return;
      if (now - lastFireAtRef.current < TIMING.fireGapMs) return;

      const cost = getWeapon(cfg, weaponIdRef.current).betCost;
      const bal = balanceRef.current;
      if (bal != null && bal < cost) {
        toast.error("Insufficient balance");
        setAutoFire(false);
        return;
      }

      lastFireAtRef.current = now;
      inflightRef.current += 1;
      setFiring(true);
      unlockDeepBassAudio();
      playDeepBassSound("shotFire");

      const look = aimAtFish(target);
      const toX = look.x;
      const toY = look.y;
      const shotId = `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const shotStarted = performance.now();
      setShots((prev) => [
        ...prev.slice(-4),
        {
          id: shotId,
          fromX: CANNON_MOUNT.x,
          fromY: CANNON_MOUNT.y,
          toX,
          toY,
        },
      ]);
      aimRef.current = look;
      setAim(look);

      window.setTimeout(() => setFiring(false), TIMING.muzzleMs);

      try {
        const res = await deepBassFireShotFn({
          data: {
            weaponId: weaponIdRef.current,
            target: {
              instanceId: target.instanceId,
            },
          },
        });
        syncBalance(res.balance);
        setGoldenHookMult(res.goldenHookMult);
        setPowerUps(res.powerUps);

        const didHit = Boolean(res.shot.hit);
        const waitFx = Math.max(0, TIMING.shotTravelMs - (performance.now() - shotStarted));
        window.setTimeout(() => {
          playDeepBassSound(
            didHit
              ? target.tierId === "super"
                ? "superHit"
                : "hit"
              : "splash",
          );
          setImpacts((prev) => [
            ...prev.slice(-4),
            { id: `imp-${shotId}`, x: toX, y: toY, hit: didHit },
          ]);
          if (didHit) {
            setHitFlashId(target.instanceId);
            window.setTimeout(() => {
              setHitFlashId((cur) => (cur === target.instanceId ? null : cur));
            }, SWIM.hitFlashMs);
          }
        }, waitFx);

        setFish((prev) =>
          prev.map((f) =>
            f.instanceId === target.instanceId
              ? {
                  ...f,
                  hitsTaken: res.fishUpdate.hitsTaken,
                  hitsRequired: res.fishUpdate.hitsRequired ?? f.hitsRequired,
                  payoutMult: res.fishUpdate.payoutMult ?? f.payoutMult,
                }
              : f,
          ),
        );

        if (res.boss) {
          setBossHud({
            hitsTaken: res.boss.hitsTaken,
            hitsRequired: res.boss.hitsRequired,
            expiresAt: res.boss.expiresAt,
          });
        } else if (target.tierId === "boss") {
          setBossHud(null);
        }

        if (res.fishUpdate.killed) {
          playKillSfx(target.tierId);
          if (res.killBanner && res.killBanner.credit > 0) {
            playDeepBassSound("coinPayout");
            showBanner(res.killBanner);
          } else if (res.crateDrop) {
            showBanner({
              label: res.crateDrop.label,
              credit: res.crateDrop.coinCredit,
              tierId: "crate",
            });
          }
          removeFish(target.instanceId);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Shot failed");
        setAutoFire(false);
      } finally {
        inflightRef.current = Math.max(0, inflightRef.current - 1);
      }
    },
    [aimAtFish, cfg, removeFish, showBanner, syncBalance],
  );

  const pickAutoTarget = useCallback((): ArenaFish | null => {
    const candidates = fishRef.current;
    let best: ArenaFish | null = null;
    let bestTier = 99;
    let bestDist = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const f = candidates[i]!;
      if (f.dying) continue;
      // Estimate only — avoid N layout reads per tick
      const aim = estimateFishAim(f, 0);
      if (!isOnScreen(aim)) continue;
      const tierRank = TIER_AUTO_PRIORITY.indexOf(f.tierId);
      const d = dist2(aim, CANNON_MOUNT);
      if (tierRank < bestTier || (tierRank === bestTier && d < bestDist)) {
        best = f;
        bestTier = tierRank;
        bestDist = d;
      }
    }
    return best;
  }, []);

  // Single auto loop: track turret + fire (no duplicate intervals / DOM thrash)
  useEffect(() => {
    if (!autoFire) return;
    let lastAimAt = 0;
    const id = window.setInterval(() => {
      if (!autoFireRef.current) return;
      const target = pickAutoTarget();
      if (!target) return;
      const now = performance.now();
      if (now - lastAimAt >= TIMING.autoAimMs) {
        lastAimAt = now;
        const look = aimAtFish(target, 0);
        aimRef.current = look;
        setAim(look);
      }
      if (inflightRef.current >= TIMING.maxInflightShots) return;
      if (now - lastFireAtRef.current < TIMING.fireGapMs) return;
      void fireAt(target);
    }, TIMING.autoFireMs);
    return () => window.clearInterval(id);
  }, [aimAtFish, autoFire, fireAt, pickAutoTarget]);

  async function changeWeapon(id: WeaponTierId) {
    if (id === weaponId) return;
    unlockDeepBassAudio();
    playDeepBassSound("weaponSwitch");
    setWeaponId(id);
    try {
      const session = await deepBassSetWeaponFn({ data: { weaponId: id } });
      syncBalance(session.balance);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Weapon change failed");
    }
  }

  async function buyPower(id: PowerUpId) {
    unlockDeepBassAudio();
    playDeepBassSound("uiClick");
    try {
      const res = await deepBassBuyPowerUpFn({ data: { powerUpId: id } });
      syncBalance(res.balance);
      setGoldenHookMult(res.goldenHookMult);
      setPowerUps(res.powerUps);
      toast.success("Power-up acquired");
      playDeepBassSound("crateDrop");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    }
  }

  async function useNetBomb() {
    if ((powerUps["net-bomb"] ?? 0) < 1) {
      toast.error("No Net Bomb");
      return;
    }
    unlockDeepBassAudio();
    playDeepBassSound("netBomb");
    try {
      const targets = fish
        .filter((f) => !f.dying && f.tierId !== "boss")
        .slice(0, 10)
        .map((f) => ({
          instanceId: f.instanceId,
        }));
      const res = await deepBassUseNetBombFn({ data: { weaponId, targets } });
      syncBalance(res.balance);
      setGoldenHookMult(res.goldenHookMult);
      setPowerUps(res.powerUps);
      const killedIds = new Set<string>();
      res.results.forEach((r, i) => {
        const instanceId = res.targetInstanceIds?.[i] ?? targets[i]?.instanceId;
        if (!instanceId) return;
        if (r.hit) {
          playDeepBassSound("hit", 0.35);
          setFish((prev) =>
            prev.map((f) =>
              f.instanceId === instanceId ? { ...f, hitsTaken: r.hitsTaken } : f,
            ),
          );
        }
        if (r.killed) killedIds.add(instanceId);
      });
      killedIds.forEach((id) => removeFish(id));
      if (res.totalCredit > 0) {
        playDeepBassSound("coinPayout");
        showBanner({ label: "Net Bomb", credit: res.totalCredit, tierId: "rare" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Net Bomb failed");
    }
  }

  async function useFreeze() {
    if ((powerUps["freeze-lure"] ?? 0) < 1) {
      toast.error("No Freeze Lure");
      return;
    }
    unlockDeepBassAudio();
    playDeepBassSound("freeze");
    try {
      const res = await deepBassUseFreezeLureFn();
      setPowerUps(res.powerUps);
      const until = Date.now() + res.durationSec * 1000;
      setFish((prev) => prev.map((f) => ({ ...f, frozenUntil: until })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Freeze failed");
    }
  }

  function onArenaMove(e: MouseEvent) {
    const el = arenaRef.current;
    if (!el || autoFireRef.current) return;
    const rect = el.getBoundingClientRect();
    const next = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
    const prev = aimRef.current;
    // Skip tiny pointer jitter to cut re-renders
    if (
      prev &&
      Math.abs(prev.x - next.x) < 0.8 &&
      Math.abs(prev.y - next.y) < 0.8
    ) {
      return;
    }
    aimRef.current = next;
    setAim(next);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#021820] text-teal-50">
      {/* Top HUD — boat console */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-teal-500/25 bg-gradient-to-b from-[#0a2a36]/95 to-black/70 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Fish className="h-5 w-5 text-teal-300" />
          <div>
            <div className="text-sm font-black tracking-wide text-teal-100">{gameName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-teal-400/80">
              Boat view — looking down
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {goldenHookMult > 1 ? (
            <span className="rounded bg-amber-500/20 px-2 py-1 font-semibold text-amber-200">
              Golden Hook ×{goldenHookMult}
            </span>
          ) : null}
          {balance != null ? (
            <span className="rounded bg-teal-500/15 px-2.5 py-1 font-bold tabular-nums text-teal-100">
              {formatPhp(balance)}
            </span>
          ) : (
            <span className="text-teal-500/60">…</span>
          )}
          <button
            type="button"
            className="rounded p-1.5 text-teal-300 hover:bg-white/10"
            onClick={() => {
              unlockDeepBassAudio();
              const next = !muted;
              setMuted(next);
              setDeepBassMuted(next);
              if (!next) playDeepBassSound("uiClick");
            }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {bossHud ? (
        <div className="relative z-20 mx-3 mt-2 rounded-lg border border-rose-400/40 bg-rose-950/50 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-bold text-rose-100">
            <span>THE DEEP BASS</span>
            <span className="tabular-nums">
              {bossHud.hitsTaken}/{bossHud.hitsRequired} HP
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all"
              style={{
                width: `${Math.max(0, 100 - (bossHud.hitsTaken / bossHud.hitsRequired) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Arena — top-down seabed (you're on the boat looking into the water) */}
      <div
        ref={arenaRef}
        className="relative z-10 min-h-0 flex-1 cursor-crosshair overflow-hidden"
        onMouseMove={onArenaMove}
        onMouseLeave={() => setAim(null)}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[#034a5c] bg-cover bg-center"
          style={{ backgroundImage: `url(${DEEP_BASS_ASSET.seabed})` }}
          aria-hidden
        />
        {/* Water caustics / depth vignette */}
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 45%, transparent 20%, rgba(1,20,30,0.55) 100%), linear-gradient(180deg, rgba(56,189,248,0.12) 0%, transparent 28%, transparent 72%, rgba(2,16,24,0.55) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0 1px, transparent 2px 48px)",
          }}
        />
        {/* Boat gunwale — you're fishing from the railing at the bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-16"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(8,40,50,0.35) 35%, rgba(20,55,48,0.92) 78%, #1a3328 100%)",
            boxShadow: "inset 0 8px 18px rgba(0,0,0,0.35)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-[12%] bottom-[2.75rem] z-[7] h-1.5 rounded-full bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />

        <AnimatePresence>
          {fish.map((f) => {
            const frozen = f.frozenUntil > Date.now();
            const isHitFlash = hitFlashId === f.instanceId;
            const progressKey = f.instanceId;
            // Use left/top (% of arena), NOT transform x/y — Framer Motion % on
            // x/y is relative to the fish element size, which pinned everything
            // to the top-left corner.
            const startLeft = f.fromLeft ? "-12%" : "112%";
            const endLeft = f.fromLeft ? "112%" : "-12%";
            const midLeft = f.fromLeft ? "48%" : "52%";
            const pathAmp = pathAmpFor(f.path);
            const yMid = Math.max(10, Math.min(86, f.y + pathAmp));
            const yEnd = Math.max(10, Math.min(86, f.y + pathAmp * 0.35));
            return (
              <motion.button
                key={progressKey}
                type="button"
                disabled={f.dying}
                ref={(node) => {
                  if (node) fishElsRef.current.set(f.instanceId, node);
                  else fishElsRef.current.delete(f.instanceId);
                }}
                initial={{
                  left: startLeft,
                  top: `${f.y}%`,
                  opacity: 0,
                  scale: 0.94,
                }}
                animate={
                  f.dying
                    ? { opacity: 0, scale: 0.4, rotate: 8 }
                    : frozen
                      ? {
                          left: midLeft,
                          top: `${f.y}%`,
                          opacity: 1,
                          scale: 1,
                        }
                      : {
                          left: endLeft,
                          top: [`${f.y}%`, `${yMid}%`, `${yEnd}%`],
                          opacity: 1,
                          scale: 1,
                        }
                }
                transition={
                  f.dying
                    ? { duration: SWIM.deathMs / 1000 }
                    : frozen
                      ? { duration: 0.28, ease: "easeOut" }
                      : {
                          left: {
                            duration: f.speedMs / 1000,
                            ease: "linear",
                          },
                          top: {
                            duration: f.speedMs / 1000,
                            ease: "easeInOut",
                          },
                          opacity: { duration: 0.28, ease: "easeOut" },
                          scale: { duration: 0.28, ease: "easeOut" },
                        }
                }
                className="absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0"
                style={{
                  zIndex:
                    f.tierId === "boss" ? 5 : f.tierId === "super" ? 4 : 2,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  void fireAt(f);
                }}
              >
                <div
                  className={cn(
                    "relative transition-[filter,transform] duration-100",
                    isHitFlash && "scale-110 brightness-150",
                  )}
                >
                  <FishSprite
                    tierId={f.tierId}
                    size={f.size}
                    flipped={!f.fromLeft}
                    frozen={frozen}
                    hitFlash={isHitFlash}
                    animSeed={f.createdAt}
                  />
                  {f.tierId === "super" ? (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-fuchsia-600/90 px-1.5 text-[8px] font-black tracking-wider text-white shadow">
                      SUPER
                    </span>
                  ) : null}
                  {f.hitsRequired > 1 ? (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1 text-[9px] font-bold tabular-nums text-white">
                      {f.hitsTaken}/{f.hitsRequired}
                    </span>
                  ) : null}
                  {f.tierId !== "crate" && f.payoutMult > 0 ? (
                    <span
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 text-[9px] font-black drop-shadow",
                        f.tierId === "super"
                          ? "-top-7 text-fuchsia-200"
                          : "-top-1 text-amber-200",
                      )}
                    >
                      {f.payoutMult}×
                    </span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {aim ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${aim.x}%`, top: `${aim.y}%` }}
          >
            <Target className="h-6 w-6 text-teal-200/50" />
          </div>
        ) : null}

        <AnimatePresence>
          {banner ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex justify-center"
            >
              <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-500/30 to-teal-950/80 px-6 py-3 text-center shadow-2xl backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-widest text-amber-100/80">
                  {banner.label}
                </div>
                <div className="text-2xl font-black tabular-nums text-amber-50">
                  {banner.credit > 0 ? `+${formatPhp(banner.credit)}` : "Bonus!"}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Boat cannon — 3D turret + bullets */}
        <BoatCannon
          aim={aim}
          firing={firing}
          shots={shots}
          impacts={impacts}
          mountX={CANNON_MOUNT.x}
          mountY={CANNON_MOUNT.y}
          onShotDone={(id) => setShots((prev) => prev.filter((s) => s.id !== id))}
          onImpactDone={(id) => setImpacts((prev) => prev.filter((s) => s.id !== id))}
        />
      </div>

      {/* Boat dock / controls — full viewport width */}
      <div
        className="relative z-20 w-full shrink-0 border-t border-teal-400/30 bg-gradient-to-b from-[#0a2430] via-[#071820] to-black"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
          paddingRight: "max(0.5rem, env(safe-area-inset-right))",
        }}
      >
        <div className="w-full space-y-2 px-2 pt-2 sm:px-3 sm:pt-2.5">
          {/* Weapons — stretch across full width */}
          <div className="grid w-full grid-cols-5 gap-1 sm:gap-1.5">
            {cfg.weapons.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => void changeWeapon(w.id)}
                className={cn(
                  "min-w-0 rounded-xl border px-1 py-2 text-center transition sm:px-2 sm:py-2.5",
                  weaponId === w.id
                    ? "border-teal-300/80 bg-teal-500/30 text-teal-50 shadow-[0_0_16px_rgba(45,212,191,0.25)]"
                    : "border-white/10 bg-white/5 text-teal-200/80 hover:bg-white/10",
                )}
              >
                <div className="truncate text-[9px] font-bold leading-tight sm:text-[11px]">
                  {w.id === "master" ? "Master Rig" : w.label}
                </div>
                <div className="mt-0.5 truncate text-[8px] tabular-nums text-teal-300/85 sm:text-[10px]">
                  {formatPhp(w.betCost)}
                </div>
              </button>
            ))}
          </div>

          {/* Actions — full width row */}
          <div className="flex w-full items-stretch gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                unlockDeepBassAudio();
                playDeepBassSound("uiClick");
                setAutoFire((v) => !v);
              }}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2.5 text-[11px] font-black tracking-wide sm:px-4 sm:text-xs",
                autoFire
                  ? "bg-amber-500 text-amber-950"
                  : "bg-teal-600 text-white hover:bg-teal-500",
              )}
            >
              {autoFire ? "AUTO ON" : "AUTO FIRE"}
            </button>

            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto sm:gap-2">
              {cfg.powerUps.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if ((powerUps[p.id] ?? 0) > 0) {
                      if (p.id === "net-bomb") void useNetBomb();
                      else if (p.id === "freeze-lure") void useFreeze();
                      else toast.message("Golden Hook arms on next kill");
                    } else {
                      void buyPower(p.id);
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 text-[10px] text-teal-100 hover:bg-white/10 sm:text-[11px]"
                >
                  {p.id === "freeze-lure" ? (
                    <Snowflake className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="whitespace-nowrap font-semibold">
                    {p.label}{" "}
                    {(powerUps[p.id] ?? 0) > 0
                      ? `×${powerUps[p.id]}`
                      : formatPhp(p.cost)}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden shrink-0 items-center rounded-xl border border-teal-500/20 bg-teal-950/40 px-3 py-2 text-[11px] text-teal-300 sm:flex">
              Shot{" "}
              <span className="ml-1 font-black tabular-nums text-teal-50">
                {formatPhp(weapon.betCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-0.5 pb-0.5 text-[10px] text-teal-400/80 sm:hidden">
            <span>Shot cost</span>
            <span className="font-bold tabular-nums text-teal-100">
              {formatPhp(weapon.betCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Alias matching card-game naming. */
export const DeepBassArena = DeepBassGame;
