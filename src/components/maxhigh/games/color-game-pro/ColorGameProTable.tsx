import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { colorGameProDealFn, getColorGameProEngineConfigFn } from "@/functions/color-game-pro";
import { useAuth } from "@/lib/auth";
import {
  COLOR_GAME_PRO_GAME_ID,
  COLOR_SPOT_IDS,
  DEFAULT_COLOR_GAME_PRO_CONFIG,
  type ColorGameProConfig,
  type ColorSpotId,
} from "@/lib/color-game-pro-config";
import { cn } from "@/lib/utils";
import {
  isColorGameProMuted,
  playColorGameProSound,
  setColorGameProMuted,
  startWheelSpinPro,
  unlockColorGameProAudio,
  wheelEasePro,
} from "./audio";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { getColorGameProConfig, setColorGameProConfig } from "./runtimeConfig";
import type { PublicDealScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

const SPIN_MS = 4800;
const IDLE_BANNER = "Pick a color · add chips · SPIN";
const HISTORY_MAX = 14;

type Bets = Record<ColorSpotId, number>;

function emptyBets(): Bets {
  return Object.fromEntries(COLOR_SPOT_IDS.map((id) => [id, 0])) as Bets;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Deterministic PRNG so decorative layers render identically on server and client. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeBurst(n: number, palette: string[]) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.9,
    dur: 1.6 + Math.random() * 1.4,
    size: 6 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 120,
    color: palette[i % palette.length]!,
  }));
}

/**
 * Color Game Pro (V2) — "Neon Night Market".
 * Aurora sky, twinkling stars, a synthwave grid floor, drifting lanterns, an orbiting-comet
 * neon wheel, a results strip, shockwave + coin-rain wins, and rebet / double.
 */
export function ColorGameProTable({
  gameId = COLOR_GAME_PRO_GAME_ID,
  gameName = "Color Game",
  onBalance,
}: Props) {
  void gameId;
  const { user, setBalanceLocal } = useAuth();
  const [cfg, setCfg] = useState<ColorGameProConfig>(() => getColorGameProConfig());
  const [bets, setBets] = useState<Bets>(emptyBets);
  const [lastBets, setLastBets] = useState<Bets | null>(null);
  const [activeSpot, setActiveSpot] = useState<ColorSpotId>("red");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winning, setWinning] = useState<ColorSpotId | null>(null);
  const [banner, setBanner] = useState(IDLE_BANNER);
  const [lastCredit, setLastCredit] = useState(0);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [muted, setMuted] = useState(() => isColorGameProMuted());
  const [history, setHistory] = useState<ColorSpotId[]>([]);
  const [net, setNet] = useState(0);
  const [burst, setBurst] = useState<{
    key: number;
    coins: ReturnType<typeof makeBurst>;
    big: boolean;
  } | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const stopAudioRef = useRef<() => void>(() => undefined);
  const mountedRef = useRef(true);

  const balance = user?.balance ?? localBalance;

  const syncBalance = useCallback(
    (n: number) => {
      setLocalBalance(n);
      setBalanceLocal(n);
      onBalance?.(n);
    },
    [onBalance, setBalanceLocal],
  );

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getColorGameProEngineConfigFn();
        if (cancelled) return;
        setColorGameProConfig(remote);
        setCfg(remote);
      } catch {
        setCfg(DEFAULT_COLOR_GAME_PRO_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      stopAudioRef.current();
    };
  }, []);

  const slice = 360 / Math.max(1, cfg.spots.length);

  // decorative layers (deterministic)
  const stars = useMemo(() => {
    const r = lcg(7);
    return Array.from({ length: 70 }, (_, i) => ({
      i,
      x: r() * 100,
      y: r() * 62,
      s: 1 + r() * 2.2,
      d: r() * 4,
    }));
  }, []);
  const lanterns = useMemo(() => {
    const r = lcg(21);
    return Array.from({ length: 9 }, (_, i) => ({
      i,
      x: 4 + r() * 92,
      s: 16 + r() * 22,
      d: -r() * 24,
      t: 18 + r() * 16,
      c: cfg.spots[i % Math.max(1, cfg.spots.length)]?.hex ?? "#fff",
    }));
  }, [cfg.spots]);
  const ticks = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  const totalStake = +Object.values(bets)
    .reduce((a, b) => a + b, 0)
    .toFixed(2);

  function onBet(spot: ColorSpotId, n: number) {
    setBets((prev) => ({ ...prev, [spot]: n }));
  }
  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockColorGameProAudio();
    playColorGameProSound("chip");
  }
  function clearAll() {
    setBets(emptyBets());
    setWinning(null);
    setLastCredit(0);
    setBanner(IDLE_BANNER);
    playColorGameProSound("click");
  }
  function rebet() {
    if (!lastBets) return;
    unlockColorGameProAudio();
    setBets({ ...lastBets });
    playColorGameProSound("chip");
  }
  function doubleBets() {
    unlockColorGameProAudio();
    setBets((prev) => {
      const next = emptyBets();
      for (const id of COLOR_SPOT_IDS)
        next[id] = Math.min(cfg.maxSpotBet, +((prev[id] ?? 0) * 2).toFixed(2));
      return next;
    });
    playColorGameProSound("chip");
  }

  function paintWheel(deg: number) {
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;
  }

  function spinWheelTo(script: PublicDealScript): Promise<void> {
    return new Promise((resolve) => {
      const idx = Math.max(
        0,
        cfg.spots.findIndex((s) => s.id === script.winningColor),
      );
      const cur = angleRef.current;
      const jitter = (Math.random() - 0.5) * slice * 0.6;
      const want = mod(-(idx * slice + slice / 2 + jitter), 360);
      const total = 360 * 6 + mod(want - cur, 360);

      stopAudioRef.current();
      stopAudioRef.current = startWheelSpinPro({
        totalDeg: total,
        startDeg: cur,
        sliceDeg: slice,
        durationSec: SPIN_MS / 1000,
      });

      const t0 = performance.now();
      let lastSlice = Math.floor(cur / slice);
      const frame = (now: number) => {
        if (!mountedRef.current) return;
        const p = Math.min(1, (now - t0) / SPIN_MS);
        const deg = cur + total * wheelEasePro(p);
        angleRef.current = deg;
        paintWheel(deg);
        const s = Math.floor(deg / slice);
        if (s !== lastSlice) {
          lastSlice = s;
          const f = flapRef.current;
          if (f) {
            f.style.transition = "none";
            f.style.transform = "rotate(-20deg)";
            requestAnimationFrame(() => {
              f.style.transition = "transform 100ms ease-out";
              f.style.transform = "rotate(0deg)";
            });
          }
        }
        if (p < 1) rafRef.current = requestAnimationFrame(frame);
        else {
          angleRef.current = cur + total;
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    });
  }

  async function playReveal(script: PublicDealScript, staked: number) {
    setSpinning(true);
    playColorGameProSound("deal", 0.9);
    await spinWheelTo(script);
    if (!mountedRef.current) return;
    setWinning(script.winningColor);
    setSpinning(false);
    setLastCredit(script.immediateCredit);
    setHistory((h) => [script.winningColor, ...h].slice(0, HISTORY_MAX));
    setNet((n) => +(n + script.immediateCredit - staked).toFixed(2));
    const hex = cfg.spots.find((s) => s.id === script.winningColor)?.hex ?? "#22d3ee";
    if (script.immediateCredit > 0) {
      const big = staked > 0 && script.immediateCredit / staked >= 4;
      playColorGameProSound(big ? "bigWin" : "win");
      setBanner(
        `WIN · ${script.winningColor.toUpperCase()} · +₱${script.immediateCredit.toFixed(2)}`,
      );
      setBurst({
        key: Date.now(),
        coins: makeBurst(big ? 44 : 22, ["#fde047", "#fbbf24", hex, "#ffffff"]),
        big,
      });
    } else {
      playColorGameProSound("lose", 0.8);
      setBanner(`${script.winningColor.toUpperCase()} · no win — go again`);
    }
  }

  async function onDeal() {
    const total = +cfg.spots.reduce((s, sp) => s + (bets[sp.id] ?? 0), 0).toFixed(2);
    if (total < cfg.minBet) {
      toast.error(`Min total bet ₱${cfg.minBet}`);
      return;
    }
    unlockColorGameProAudio();
    setBusy(true);
    setWinning(null);
    setBurst(null);
    setLastCredit(0);
    setBanner("Spinning…");
    const snapshot = { ...bets };
    try {
      const res = await colorGameProDealFn({ data: { bets } });
      syncBalance(res.balance);
      setLastBets(snapshot);
      await playReveal(res.script, total);
      setBets(emptyBets());
    } catch (e) {
      stopAudioRef.current();
      setSpinning(false);
      toast.error(e instanceof Error ? e.message : "Spin failed");
      setBanner(IDLE_BANNER);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  const conic = cfg.spots
    .map((sp, i) => `${sp.hex} ${i * slice}deg ${(i + 1) * slice}deg`)
    .join(", ");
  const winIdx = winning ? cfg.spots.findIndex((s) => s.id === winning) : -1;
  const winHex = winIdx >= 0 ? cfg.spots[winIdx]!.hex : "#22d3ee";
  const hexOf = (id: ColorSpotId) => cfg.spots.find((s) => s.id === id)?.hex ?? "#fff";

  return (
    <div className="pro-root relative flex h-full min-h-0 flex-col overflow-hidden text-white">
      <style>{CSS}</style>

      {/* ── atmosphere ─────────────────────────────────────────── */}
      <div className="pro-sky pointer-events-none absolute inset-0" />
      <div className="pro-aurora pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {stars.map((s) => (
          <span
            key={s.i}
            className="pro-star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {lanterns.map((l) => (
          <span
            key={l.i}
            className="pro-lantern"
            style={{
              left: `${l.x}%`,
              width: l.s,
              height: l.s * 1.25,
              animationDuration: `${l.t}s`,
              animationDelay: `${l.d}s`,
              ["--lc" as string]: l.c,
            }}
          />
        ))}
      </div>
      <div className="pro-floor pointer-events-none absolute inset-x-0 bottom-0" />
      {winning && lastCredit > 0 && (
        <div
          key={`flash-${burst?.key ?? 0}`}
          className="pro-flash pointer-events-none absolute inset-0"
          style={{ ["--fx" as string]: winHex }}
        />
      )}

      {/* ── header ─────────────────────────────────────────────── */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.55rem,env(safe-area-inset-top))] pr-14 sm:pr-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="pro-title truncate text-[1.2rem] font-black tracking-[0.12em] uppercase">
              {gameName}
            </span>
            <span className="pro-badge">PRO · V2</span>
          </div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-cyan-200/60 uppercase">
            Neon night market · pays {cfg.spots[0]?.payoutMult ?? 5.5}×
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setColorGameProMuted(next);
              if (!next) {
                unlockColorGameProAudio();
                playColorGameProSound("click");
              }
            }}
            className="pro-glass grid size-9 place-items-center rounded-full text-cyan-200"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {balance != null && (
            <div className="pro-glass pro-balance rounded-2xl px-3 py-1.5 text-base font-bold tabular-nums">
              ₱{balance.toFixed(2)}
            </div>
          )}
        </div>
      </header>

      {/* ── stage ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-3 py-1">
        <div
          className="relative mx-auto aspect-square shrink-0"
          style={{ width: "min(92vw, calc(100dvh - 21rem), 27rem)", containerType: "inline-size" }}
        >
          <div
            className={cn(
              "pro-halo absolute -inset-[14%] rounded-full",
              spinning && "pro-halo-fast",
            )}
            style={{ ["--halo" as string]: winning ? winHex : "#22d3ee" }}
          />

          {/* pointer — neon gem, tip DOWN into the wheel, kicks on every peg */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-30"
            style={{
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0 0 10px rgba(34,211,238,.9))",
            }}
          >
            <div
              ref={flapRef}
              className="relative origin-top"
              style={{ width: "clamp(46px, 13cqw, 66px)", aspectRatio: "0.84" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg,#ecfeff 0%,#22d3ee 40%,#0e7490 100%)",
                }}
              />
              <div
                className="absolute"
                style={{
                  inset: "10% 18% 28% 18%",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg,#f472b6 0%,#be185d 100%)",
                }}
              />
            </div>
          </div>

          {/* neon ring (hue-cycling conic) */}
          <div
            className={cn("pro-ring absolute inset-0 rounded-full", spinning && "pro-ring-fast")}
          />
          {/* orbiting comet */}
          <div className={cn("pro-orbit absolute inset-0", spinning && "pro-orbit-fast")}>
            <span className="pro-comet" />
          </div>

          <div className="absolute inset-[3.4%] rounded-full bg-[#050816] p-[2.2%] shadow-[0_0_40px_rgba(34,211,238,.35),inset_0_0_30px_rgba(0,0,0,.9)]">
            <div className="relative size-full overflow-hidden rounded-full">
              <div
                ref={wheelRef}
                className="absolute inset-0 rounded-full will-change-transform"
                style={{ background: `conic-gradient(${conic})` }}
              >
                {/* dome shading: darker toward the rim, brighter near the hub */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle closest-side, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,.12) 70%, rgba(0,0,0,.5) 100%)",
                  }}
                />
                {/* bezel tick marks (rotate with the disc so you SEE the speed) */}
                <div className="pro-bezel absolute inset-0 rounded-full" />

                {cfg.spots.map((sp, i) => {
                  const a = i * slice;
                  const mid = a + slice / 2;
                  const dark = sp.id === "white" || sp.id === "yellow";
                  return (
                    <div key={sp.id}>
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{ transform: `rotate(${a}deg)` }}
                      >
                        <div className="absolute left-1/2 top-0 h-1/2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-white/90 via-white/30 to-transparent shadow-[0_0_8px_rgba(255,255,255,.8)]" />
                      </div>
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{ transform: `rotate(${mid}deg)` }}
                      >
                        <span
                          className="absolute left-1/2 top-[14%] -translate-x-1/2 text-[0.72rem] font-black uppercase tracking-[0.12em] sm:text-sm"
                          style={{
                            color: dark ? "#0b1020" : "#fff",
                            textShadow: dark
                              ? "0 1px 0 rgba(255,255,255,.5)"
                              : "0 0 8px rgba(0,0,0,.65)",
                          }}
                        >
                          {sp.label}
                        </span>
                        <span
                          className="absolute left-1/2 top-[25%] -translate-x-1/2 rounded-full px-1.5 text-[0.55rem] font-bold tabular-nums sm:text-[0.65rem]"
                          style={{
                            color: dark ? "#0b1020" : "#fff",
                            background: dark ? "rgba(0,0,0,.14)" : "rgba(0,0,0,.28)",
                          }}
                        >
                          {sp.payoutMult}×
                        </span>
                      </div>
                    </div>
                  );
                })}

                {winIdx >= 0 && (
                  <div
                    className="pro-win-slice pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from ${winIdx * slice}deg, rgba(255,255,255,.7) 0deg ${slice}deg, transparent ${slice}deg 360deg)`,
                    }}
                  />
                )}
              </div>

              {/* glass dome (static) */}
              <div className="pro-dome pointer-events-none absolute inset-0 rounded-full" />

              {/* hub */}
              <div className="pro-hub absolute inset-[30%] z-10 grid place-items-center rounded-full">
                {winning ? (
                  <span
                    className="pro-pop text-center text-sm font-black uppercase tracking-wider sm:text-base"
                    style={{ color: winHex, textShadow: `0 0 14px ${winHex}` }}
                  >
                    {winning}
                  </span>
                ) : (
                  <span className="pro-hub-label text-[10px] font-black uppercase tracking-[0.3em]">
                    {spinning ? "···" : "PRO"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* shockwaves */}
          {burst && lastCredit > 0 && (
            <div key={`sw-${burst.key}`} className="pointer-events-none absolute inset-0 z-20">
              {ticks.slice(0, burst.big ? 5 : 3).map((i) => (
                <span
                  key={i}
                  className="pro-shock"
                  style={{ animationDelay: `${i * 0.18}s`, borderColor: winHex }}
                />
              ))}
            </div>
          )}
        </div>

        {/* results strip */}
        <div className="mt-3 flex w-full max-w-md items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-[9px] font-black tracking-[0.22em] text-cyan-200/60 uppercase">
              Last
            </span>
            <div className="flex items-center gap-1">
              {history.length === 0 && (
                <span className="text-[10px] text-white/35">no spins yet</span>
              )}
              {history.map((id, i) => (
                <span
                  key={`${id}-${history.length - i}`}
                  className={cn("pro-dot", i === 0 && "pro-dot-new")}
                  style={{ background: hexOf(id), boxShadow: `0 0 8px ${hexOf(id)}` }}
                  title={id}
                />
              ))}
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black tabular-nums tracking-wider",
              net > 0
                ? "bg-emerald-400/20 text-emerald-200"
                : net < 0
                  ? "bg-rose-400/20 text-rose-200"
                  : "bg-white/10 text-white/60",
            )}
          >
            SESSION {net >= 0 ? "+" : "−"}₱{Math.abs(net).toFixed(2)}
          </div>
        </div>

        <div
          className={cn(
            "mt-2 rounded-full px-5 py-1.5 text-center text-sm font-bold tracking-wide backdrop-blur",
            lastCredit > 0 ? "pro-win-banner" : "pro-glass text-white/85",
          )}
          style={lastCredit > 0 ? { ["--fx" as string]: winHex } : undefined}
        >
          {banner}
        </div>
      </div>

      {/* coin rain */}
      {burst && lastCredit > 0 && (
        <div
          key={`coins-${burst.key}`}
          className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
        >
          {burst.coins.map((c) => (
            <span
              key={c.id}
              className="pro-coin"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                ["--dx" as string]: `${c.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="pro-dock relative z-20 shrink-0">
        <BettingPanel
          cfg={cfg}
          bets={bets}
          disabled={busy}
          activeSpot={activeSpot}
          winning={winning}
          canRebet={!!lastBets && totalStake === 0}
          onActiveSpot={setActiveSpot}
          onBet={onBet}
          onChipPlaced={onChipPlaced}
          onClearAll={clearAll}
          onRebet={rebet}
          onDouble={doubleBets}
          onDeal={() => void onDeal()}
          dealBusy={busy}
        />
      </div>
    </div>
  );
}

const CSS = `
.pro-root { background: #050816; }
.pro-sky {
  background:
    radial-gradient(ellipse 90% 55% at 50% 0%, rgba(124,58,237,.55), transparent 65%),
    radial-gradient(ellipse 70% 40% at 15% 35%, rgba(14,165,233,.28), transparent 70%),
    radial-gradient(ellipse 70% 40% at 90% 40%, rgba(236,72,153,.26), transparent 70%),
    linear-gradient(180deg, #0b0630 0%, #130a45 38%, #1a0b3d 62%, #07040f 100%);
}
.pro-aurora::before, .pro-aurora::after {
  content: ""; position: absolute; left: -20%; width: 140%; height: 38%; top: 6%;
  background: linear-gradient(100deg, transparent 5%, rgba(34,211,238,.28) 30%, rgba(167,139,250,.3) 55%, rgba(244,114,182,.24) 78%, transparent 95%);
  filter: blur(26px); transform: skewY(-6deg); animation: pro-aur 11s ease-in-out infinite alternate;
}
.pro-aurora::after { top: 20%; opacity: .6; animation-duration: 15s; animation-direction: alternate-reverse;
  background: linear-gradient(80deg, transparent 8%, rgba(52,211,153,.22) 35%, rgba(34,211,238,.26) 60%, transparent 92%); }
@keyframes pro-aur { from { transform: translateX(-6%) skewY(-6deg) scaleY(.9); } to { transform: translateX(6%) skewY(4deg) scaleY(1.25); } }
.pro-star { position: absolute; border-radius: 9999px; background: #fff; animation: pro-tw 3.2s ease-in-out infinite; }
@keyframes pro-tw { 0%,100% { opacity: .15; transform: scale(.7); } 50% { opacity: 1; transform: scale(1.3); } }
.pro-lantern {
  position: absolute; bottom: -14%; border-radius: 50% 50% 46% 46%;
  background: radial-gradient(circle at 35% 30%, #fff 0%, var(--lc) 45%, color-mix(in srgb, var(--lc) 55%, #000) 100%);
  box-shadow: 0 0 22px 4px color-mix(in srgb, var(--lc) 60%, transparent);
  opacity: .5; animation: pro-rise linear infinite;
}
.pro-lantern::after { content: ""; position: absolute; left: 50%; top: 100%; width: 1px; height: 55%; background: rgba(255,255,255,.35); }
@keyframes pro-rise {
  0% { transform: translate(0, 0) rotate(-6deg); }
  50% { transform: translate(22px, -62vh) rotate(6deg); }
  100% { transform: translate(-14px, -130vh) rotate(-6deg); }
}
.pro-floor {
  height: 34%; perspective: 260px; overflow: hidden;
  -webkit-mask: linear-gradient(180deg, transparent, #000 55%); mask: linear-gradient(180deg, transparent, #000 55%);
}
.pro-floor::before {
  content: ""; position: absolute; inset: -40% -50% 0 -50%; transform: rotateX(64deg); transform-origin: 50% 0;
  background:
    repeating-linear-gradient(90deg, rgba(34,211,238,.55) 0 1.5px, transparent 1.5px 46px),
    repeating-linear-gradient(0deg, rgba(217,70,239,.55) 0 1.5px, transparent 1.5px 46px);
  animation: pro-grid 2.4s linear infinite;
}
@keyframes pro-grid { to { background-position: 0 0, 0 46px; } }
.pro-flash { background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--fx) 55%, transparent), transparent 62%); animation: pro-fl 1s ease-out forwards; }
@keyframes pro-fl { from { opacity: 1; } to { opacity: 0; } }

.pro-title {
  background: linear-gradient(90deg, #67e8f9, #c4b5fd 45%, #f9a8d4);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 10px rgba(167,139,250,.65));
}
.pro-badge {
  border-radius: 6px; padding: 1px 6px; font-size: 9px; font-weight: 900; letter-spacing: .14em; color: #0b0630;
  background: linear-gradient(90deg, #67e8f9, #f0abfc); box-shadow: 0 0 12px rgba(103,232,249,.6);
}
.pro-glass { background: rgba(8,12,40,.55); border: 1px solid rgba(125,211,252,.35); box-shadow: inset 0 0 14px rgba(34,211,238,.1), 0 0 16px rgba(34,211,238,.12); backdrop-filter: blur(8px); }
.pro-balance { color: #a5f3fc; }

.pro-halo { background: radial-gradient(circle, var(--halo) 0%, transparent 62%); opacity: .34; filter: blur(18px); animation: pro-br 3.4s ease-in-out infinite; transition: background .4s; }
.pro-halo-fast { animation-duration: .6s; opacity: .55; }
@keyframes pro-br { 0%,100% { transform: scale(.95); } 50% { transform: scale(1.06); } }
.pro-ring {
  background: conic-gradient(from 0deg, #22d3ee, #a78bfa, #f472b6, #fbbf24, #34d399, #22d3ee);
  animation: pro-rot 7s linear infinite;
  -webkit-mask: radial-gradient(circle closest-side, transparent 93.5%, #000 94%); mask: radial-gradient(circle closest-side, transparent 93.5%, #000 94%);
  filter: drop-shadow(0 0 8px rgba(167,139,250,.9));
}
.pro-ring-fast { animation-duration: 1.1s; }
@keyframes pro-rot { to { transform: rotate(360deg); } }
.pro-orbit { animation: pro-rot 4.5s linear infinite; }
.pro-orbit-fast { animation-duration: .9s; }
.pro-comet {
  position: absolute; left: 50%; top: -1.2%; width: 3.6%; aspect-ratio: 1; margin-left: -1.8%; border-radius: 9999px;
  background: #fff; box-shadow: 0 0 10px 3px #67e8f9, 0 0 24px 8px rgba(103,232,249,.7), -26px 0 18px 3px rgba(103,232,249,.35);
}
.pro-bezel {
  background: repeating-conic-gradient(rgba(255,255,255,.8) 0 .7deg, transparent .7deg 6deg);
  -webkit-mask: radial-gradient(circle closest-side, transparent 90%, #000 91%, #000 97%, transparent 98%);
  mask: radial-gradient(circle closest-side, transparent 90%, #000 91%, #000 97%, transparent 98%);
  opacity: .75;
}
.pro-dome { background: radial-gradient(ellipse 65% 34% at 38% 15%, rgba(255,255,255,.34), transparent 72%), radial-gradient(circle closest-side, transparent 62%, rgba(0,0,0,.4) 100%); }
.pro-hub {
  background: radial-gradient(circle at 35% 25%, #312e81, #0b0630 72%);
  border: 3px solid #67e8f9; box-shadow: 0 0 22px rgba(34,211,238,.7), inset 0 0 20px rgba(0,0,0,.7);
}
.pro-hub-label { background: linear-gradient(90deg,#67e8f9,#f0abfc); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pro-win-slice { animation: pro-sl .5s ease-in-out infinite alternate; mix-blend-mode: overlay; }
@keyframes pro-sl { from { opacity: .2; } to { opacity: 1; } }
.pro-pop { animation: pro-pp .45s cubic-bezier(.2,1.6,.4,1); }
@keyframes pro-pp { from { transform: scale(.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.pro-shock { position: absolute; inset: 8%; border: 3px solid; border-radius: 9999px; opacity: 0; animation: pro-sh 1.2s ease-out forwards; }
@keyframes pro-sh { 0% { transform: scale(.55); opacity: .95; } 100% { transform: scale(1.55); opacity: 0; } }
.pro-dot { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid rgba(255,255,255,.7); }
.pro-dot-new { animation: pro-pp .5s cubic-bezier(.2,1.6,.4,1); transform-origin: center; }
.pro-win-banner {
  color: #fff; background: color-mix(in srgb, var(--fx) 30%, rgba(5,8,22,.8));
  border: 1px solid var(--fx); box-shadow: 0 0 26px color-mix(in srgb, var(--fx) 70%, transparent);
  animation: pro-bn .6s cubic-bezier(.2,1.5,.4,1);
}
@keyframes pro-bn { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.pro-coin { position: absolute; top: -4%; border-radius: 9999px; box-shadow: 0 0 8px currentColor; animation: pro-cf linear forwards; }
@keyframes pro-cf { 0% { transform: translate(0,-10px); opacity: 1; } 100% { transform: translate(var(--dx), 108vh) rotate(540deg); opacity: .9; } }
.pro-dock { background: linear-gradient(180deg, rgba(8,6,32,.2), rgba(8,6,32,.85)); border-top: 1px solid rgba(125,211,252,.28); backdrop-filter: blur(10px); }
@media (prefers-reduced-motion: reduce) {
  .pro-aurora::before, .pro-aurora::after, .pro-star, .pro-lantern, .pro-floor::before, .pro-ring, .pro-orbit, .pro-halo, .pro-win-slice, .pro-coin { animation: none; }
}
`;
