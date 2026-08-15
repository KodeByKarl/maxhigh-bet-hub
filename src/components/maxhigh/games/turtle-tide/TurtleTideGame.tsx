/**
 * Turtle Tide arena — continuous-fire fish hunter shell.
 * Spawns are server-owned; client only renders live fish from syncSpawns. Shots settle server-side.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Fish, Snowflake, Target, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  TURTLE_TIDE_GAME_ID,
  DEFAULT_TURTLE_TIDE_CONFIG,
  getWeapon,
  type TurtleTideConfig,
  type FishTierId,
  type PowerUpId,
  type WeaponTierId,
} from "@/lib/turtle-tide-config";
import {
  turtleTideBossStatusFn,
  turtleTideSyncSpawnsFn,
  turtleTideBuyPowerUpFn,
  turtleTideEnsureSessionFn,
  turtleTideFireShotFn,
  turtleTideSetWeaponFn,
  turtleTideUseFreezeLureFn,
  turtleTideUseNetBombFn,
  getTurtleTideEngineConfigFn,
} from "@/functions/turtle-tide";
import { cn } from "@/lib/utils";
import { SWIM } from "./animationConfig";
import { playTurtleTideSound, setTurtleTideMuted, unlockTurtleTideAudio } from "./audio";
import { FishSprite } from "./FishSprite";
import { getTurtleTideConfig, setTurtleTideConfig } from "./runtimeConfig";
import type { ArenaFish } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

type Banner = { label: string; credit: number; tierId: FishTierId } | null;

function formatPhp(n: number) {
  return `₱${n.toFixed(2)}`;
}

export function TurtleTideGame({
  gameId = TURTLE_TIDE_GAME_ID,
  gameName = "Turtle Tide",
  onBalance,
}: Props) {
  void gameId;
  const [cfg, setCfg] = useState<TurtleTideConfig>(() => getTurtleTideConfig());
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
  const arenaRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const autoFireRef = useRef(false);
  const [autoFire, setAutoFire] = useState(false);

  const syncBalance = useCallback(
    (n: number) => {
      setBalance(n);
      onBalance?.(n);
    },
    [onBalance],
  );

  useEffect(() => {
    unlockTurtleTideAudio();
    void (async () => {
      try {
        const remote = await getTurtleTideEngineConfigFn();
        const next = remote ?? DEFAULT_TURTLE_TIDE_CONFIG;
        setTurtleTideConfig(next);
        setCfg(next);
      } catch {
        setCfg(getTurtleTideConfig());
      }
      try {
        const session = await turtleTideEnsureSessionFn({ data: { weaponId: "bamboo" } });
        if (session.weaponId) setWeaponId(session.weaponId);
        setGoldenHookMult(session.goldenHookMult ?? 1);
        setPowerUps(session.powerUps ?? {});
        syncBalance(session.balance);
        if (session.config) {
          setTurtleTideConfig(session.config);
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
              {
                instanceId: session.boss!.instanceId,
                tierId: "boss",
                hitsTaken: session.boss!.hitsTaken,
                hitsRequired: session.boss!.hitsRequired,
                payoutMult: session.boss!.payoutMult,
                y: 40,
                fromLeft: true,
                path: "wave",
                speedMs: SWIM.durationMs.boss,
                size: 260,
                frozenUntil: 0,
                createdAt: Date.now(),
              },
            ];
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to open session");
      }
    })();
  }, [syncBalance]);

  // Server-owned fish spawns — sync live list; never invent tier/instance locally.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await turtleTideSyncSpawnsFn();
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

  // Boss poll
  useEffect(() => {
    const id = window.setInterval(() => {
      void turtleTideBossStatusFn()
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
              playTurtleTideSound("bossRoar");
              return [
                ...prev.filter((f) => f.tierId !== "boss"),
                {
                  instanceId: res.boss!.instanceId,
                  tierId: "boss" as const,
                  hitsTaken: res.boss!.hitsTaken,
                  hitsRequired: res.boss!.hitsRequired,
                  payoutMult: res.boss!.payoutMult,
                  y: 38,
                  fromLeft: Math.random() > 0.5,
                  path: "wave" as const,
                  speedMs: SWIM.durationMs.boss,
                  size: 260,
                  frozenUntil: 0,
                  createdAt: Date.now(),
                },
              ];
            });
          } else {
            setBossHud(null);
            setFish((prev) => prev.filter((f) => f.tierId !== "boss"));
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  const weapon = getWeapon(cfg, weaponId);

  const removeFish = useCallback((instanceId: string) => {
    setFish((prev) =>
      prev.map((f) => (f.instanceId === instanceId ? { ...f, dying: true } : f)),
    );
    window.setTimeout(() => {
      setFish((prev) => prev.filter((f) => f.instanceId !== instanceId));
    }, SWIM.deathMs);
  }, []);

  const fireAt = useCallback(
    async (target: ArenaFish) => {
      if (busyRef.current || target.dying) return;
      if (balance != null && balance < weapon.betCost) {
        toast.error("Insufficient balance");
        setAutoFire(false);
        return;
      }
      busyRef.current = true;
      setFiring(true);
      unlockTurtleTideAudio();
      playTurtleTideSound("shotFire");
      try {
        const res = await turtleTideFireShotFn({
          data: {
            weaponId,
            target: {
              instanceId: target.instanceId,
            },
          },
        });
        syncBalance(res.balance);
        setGoldenHookMult(res.goldenHookMult);
        setPowerUps(res.powerUps);
        playTurtleTideSound(res.shot.hit ? "hit" : "splash");

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
          if (target.tierId === "boss") {
            playTurtleTideSound("bossDeath");
          } else if (target.tierId === "elite" || target.tierId === "rare") {
            playTurtleTideSound("fishDeathLarge");
          } else if (target.tierId === "crate") {
            playTurtleTideSound("crateDrop");
          } else {
            playTurtleTideSound("fishDeathSmall");
          }
          if (res.killBanner && res.killBanner.credit > 0) {
            playTurtleTideSound("coinPayout");
            setBanner(res.killBanner);
            window.setTimeout(() => setBanner(null), 1600);
          } else if (res.crateDrop) {
            setBanner({
              label: res.crateDrop.label,
              credit: res.crateDrop.coinCredit,
              tierId: "crate",
            });
            window.setTimeout(() => setBanner(null), 1600);
          }
          removeFish(target.instanceId);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Shot failed");
        setAutoFire(false);
      } finally {
        busyRef.current = false;
        setFiring(false);
      }
    },
    [balance, removeFish, syncBalance, weapon.betCost, weaponId],
  );

  // Auto-fire nearest / random fish
  useEffect(() => {
    if (!autoFire) return;
    const id = window.setInterval(() => {
      if (!autoFireRef.current || busyRef.current) return;
      setFish((prev) => {
        const candidates = prev.filter((f) => !f.dying);
        if (candidates.length === 0) return prev;
        // Prefer higher tier when auto
        const ranked = [...candidates].sort((a, b) => {
          const order: FishTierId[] = ["boss", "elite", "rare", "crate", "uncommon", "common"];
          return order.indexOf(a.tierId) - order.indexOf(b.tierId);
        });
        const target = ranked[0]!;
        void fireAt(target);
        return prev;
      });
    }, 280);
    return () => window.clearInterval(id);
  }, [autoFire, fireAt]);

  async function changeWeapon(id: WeaponTierId) {
    setWeaponId(id);
    try {
      const session = await turtleTideSetWeaponFn({ data: { weaponId: id } });
      syncBalance(session.balance);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Weapon change failed");
    }
  }

  async function buyPower(id: PowerUpId) {
    try {
      const res = await turtleTideBuyPowerUpFn({ data: { powerUpId: id } });
      syncBalance(res.balance);
      setGoldenHookMult(res.goldenHookMult);
      setPowerUps(res.powerUps);
      toast.success("Power-up acquired");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    }
  }

  async function useNetBomb() {
    if ((powerUps["net-bomb"] ?? 0) < 1) {
      toast.error("No Net Bomb");
      return;
    }
    try {
      const targets = fish
        .filter((f) => !f.dying && f.tierId !== "boss")
        .slice(0, 10)
        .map((f) => ({
          instanceId: f.instanceId,
        }));
      const res = await turtleTideUseNetBombFn({ data: { weaponId, targets } });
      syncBalance(res.balance);
      setGoldenHookMult(res.goldenHookMult);
      setPowerUps(res.powerUps);
      playTurtleTideSound("splash");
      const killedIds = new Set<string>();
      res.results.forEach((r, i) => {
        const instanceId = res.targetInstanceIds?.[i] ?? targets[i]?.instanceId;
        if (!instanceId) return;
        if (r.hit) {
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
        playTurtleTideSound("coinPayout");
        setBanner({ label: "Net Bomb", credit: res.totalCredit, tierId: "rare" });
        window.setTimeout(() => setBanner(null), 1600);
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
    try {
      const res = await turtleTideUseFreezeLureFn();
      setPowerUps(res.powerUps);
      const until = Date.now() + res.durationSec * 1000;
      setFish((prev) => prev.map((f) => ({ ...f, frozenUntil: until })));
      playTurtleTideSound("splash");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Freeze failed");
    }
  }

  function onArenaMove(e: MouseEvent) {
    const el = arenaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAim({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#021018] text-teal-50">
      {/* Ocean atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(14,116,144,0.35), transparent 60%), linear-gradient(180deg, #064e5c 0%, #021018 45%, #01080c 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(45,212,191,0.04) 29px)",
        }}
      />

      {/* Top HUD */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-teal-500/20 bg-black/35 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Fish className="h-5 w-5 text-teal-300" />
          <div>
            <div className="text-sm font-black tracking-wide text-teal-100">{gameName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-teal-400/80">
              Deep Sea Arcade
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
              const next = !muted;
              setMuted(next);
              setTurtleTideMuted(next);
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

      {/* Arena */}
      <div
        ref={arenaRef}
        className="relative z-10 min-h-0 flex-1 cursor-crosshair overflow-hidden"
        onMouseMove={onArenaMove}
        onMouseLeave={() => setAim(null)}
      >
        <AnimatePresence>
          {fish.map((f) => {
            const frozen = f.frozenUntil > Date.now();
            const progressKey = f.instanceId;
            // Use left/top (% of arena), NOT transform x/y — Framer Motion % on
            // x/y is relative to the fish element size, which pinned everything
            // to the top-left corner.
            const startLeft = f.fromLeft ? "-12%" : "112%";
            const endLeft = f.fromLeft ? "112%" : "-12%";
            const midLeft = f.fromLeft ? "48%" : "52%";
            const pathAmp =
              f.path === "dive" ? 5 : f.path === "arc" ? -4 : f.path === "zigzag" ? 3.5 : 2.5;
            const yMid = Math.max(10, Math.min(86, f.y + pathAmp));
            const yEnd = Math.max(10, Math.min(86, f.y + pathAmp * 0.35));
            return (
              <motion.button
                key={progressKey}
                type="button"
                disabled={f.dying || firing}
                initial={{
                  left: startLeft,
                  top: `${f.y}%`,
                  opacity: 0,
                  scale: 0.92,
                }}
                animate={
                  f.dying
                    ? { opacity: 0, scale: 0.35, rotate: 12 }
                    : frozen
                      ? {
                          left: midLeft,
                          top: `${f.y}%`,
                          opacity: 1,
                          scale: 1,
                        }
                      : {
                          // One smooth glide across — gentle arc, no nodding rotate/scale loops
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
                      ? { duration: 0.45, ease: "easeOut" }
                      : {
                          left: {
                            duration: f.speedMs / 1000,
                            ease: "linear",
                          },
                          top: {
                            duration: f.speedMs / 1000,
                            ease: [0.37, 0, 0.63, 1],
                          },
                          opacity: { duration: 0.5, ease: "easeOut" },
                          scale: { duration: 0.45, ease: "easeOut" },
                        }
                }
                className="absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0"
                style={{ zIndex: f.tierId === "boss" ? 5 : 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  void fireAt(f);
                }}
              >
                <div className="relative">
                  <FishSprite
                    tierId={f.tierId}
                    size={f.size}
                    flipped={!f.fromLeft}
                    frozen={frozen}
                    animSeed={f.instanceId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)}
                  />
                  {f.hitsRequired > 1 ? (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1 text-[9px] font-bold tabular-nums text-white">
                      {f.hitsTaken}/{f.hitsRequired}
                    </span>
                  ) : null}
                  {f.tierId !== "crate" && f.payoutMult > 0 ? (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-200 drop-shadow">
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
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
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

        {/* Cannon */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal-300/50 bg-gradient-to-b from-teal-600 to-slate-900 shadow-lg",
              firing && "scale-90",
            )}
          >
            <Zap className="h-6 w-6 text-amber-200" />
          </div>
        </div>
      </div>

      {/* Dock */}
      <div className="relative z-20 space-y-2 border-t border-teal-500/20 bg-black/50 px-3 py-2 backdrop-blur-md">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {cfg.weapons.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => void changeWeapon(w.id)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition",
                weaponId === w.id
                  ? "border-teal-300/70 bg-teal-500/25 text-teal-50"
                  : "border-white/10 bg-white/5 text-teal-200/80 hover:bg-white/10",
              )}
            >
              <div className="font-bold">{w.label}</div>
              <div className="tabular-nums text-teal-300/80">{formatPhp(w.betCost)}/shot</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoFire((v) => !v)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-bold",
              autoFire
                ? "bg-amber-500 text-amber-950"
                : "bg-teal-600/80 text-white hover:bg-teal-500",
            )}
          >
            {autoFire ? "AUTO ON" : "AUTO FIRE"}
          </button>

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
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-teal-100 hover:bg-white/10"
            >
              {p.id === "freeze-lure" ? (
                <Snowflake className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>
                {p.label}{" "}
                {(powerUps[p.id] ?? 0) > 0
                  ? `×${powerUps[p.id]}`
                  : formatPhp(p.cost)}
              </span>
            </button>
          ))}

          <div className="ml-auto text-[11px] text-teal-400/80">
            Shot cost{" "}
            <span className="font-bold text-teal-100">{formatPhp(weapon.betCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Alias matching card-game naming. */
export const TurtleTideArena = TurtleTideGame;
