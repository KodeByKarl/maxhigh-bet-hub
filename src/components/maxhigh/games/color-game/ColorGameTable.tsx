import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { colorGameDealFn, getColorGameEngineConfigFn } from "@/functions/color-game";
import { useAuth } from "@/lib/auth";
import {
  COLOR_GAME_GAME_ID,
  COLOR_SPOT_IDS,
  DEFAULT_COLOR_GAME_CONFIG,
  type ColorGameConfig,
  type ColorSpotId,
} from "@/lib/color-game-config";
import { cn } from "@/lib/utils";
import {
  isColorGameMuted,
  playColorGameSound,
  setColorGameMuted,
  startWheelSpin,
  unlockColorGameAudio,
  wheelEase,
} from "./audio";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { getColorGameConfig, setColorGameConfig } from "./runtimeConfig";
import type { PublicDealScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

const SPIN_MS = 4300;
const BULBS = 28;
const IDLE_BANNER = "Pick a color · add chips · SPIN";

function emptyBets(): Record<ColorSpotId, number> {
  return Object.fromEntries(COLOR_SPOT_IDS.map((id) => [id, 0])) as Record<ColorSpotId, number>;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Confetti pieces are randomised once per burst so renders stay stable. */
function makeConfetti(n: number, palette: string[]) {
  return Array.from({ length: n }, (_, i) => {
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    return {
      id: i,
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist - 60,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.12,
      color: palette[i % palette.length]!,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
    };
  });
}

/**
 * Color Game — perya wheel with marquee bulbs, pegs, a ratcheting pointer and a
 * physically-timed spin (rAF + the same easing the audio ticks are scheduled from).
 */
export function ColorGameTable({
  gameId = COLOR_GAME_GAME_ID,
  gameName = "Color Game",
  onBalance,
}: Props) {
  void gameId;
  const { user, setBalanceLocal } = useAuth();
  const [cfg, setCfg] = useState<ColorGameConfig>(() => getColorGameConfig());
  const [bets, setBets] = useState<Record<ColorSpotId, number>>(emptyBets);
  const [activeSpot, setActiveSpot] = useState<ColorSpotId>("red");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winning, setWinning] = useState<ColorSpotId | null>(null);
  const [banner, setBanner] = useState(IDLE_BANNER);
  const [lastCredit, setLastCredit] = useState(0);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [muted, setMuted] = useState(() => isColorGameMuted());
  const [burst, setBurst] = useState<{
    key: number;
    pieces: ReturnType<typeof makeConfetti>;
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
        const remote = await getColorGameEngineConfigFn();
        if (cancelled) return;
        setColorGameConfig(remote);
        setCfg(remote);
      } catch {
        setCfg(DEFAULT_COLOR_GAME_CONFIG);
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

  function onBet(spot: ColorSpotId, n: number) {
    setBets((prev) => ({ ...prev, [spot]: n }));
  }

  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockColorGameAudio();
    playColorGameSound("chip");
  }

  function clearAll() {
    setBets(emptyBets());
    setWinning(null);
    setLastCredit(0);
    setBanner(IDLE_BANNER);
  }

  function paintWheel(deg: number) {
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;
  }

  /** Spin to land `script.winningColor` under the pointer; resolves when settled. */
  function spinWheelTo(script: PublicDealScript): Promise<void> {
    return new Promise((resolve) => {
      const idx = Math.max(
        0,
        cfg.spots.findIndex((s) => s.id === script.winningColor),
      );
      const cur = angleRef.current;
      // land inside the slice (not always dead-centre) for a natural feel
      const jitter = (Math.random() - 0.5) * slice * 0.6;
      const want = mod(-(idx * slice + slice / 2 + jitter), 360);
      const total = 360 * 5 + mod(want - cur, 360);

      stopAudioRef.current();
      stopAudioRef.current = startWheelSpin({
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
        const deg = cur + total * wheelEase(p);
        angleRef.current = deg;
        paintWheel(deg);
        const s = Math.floor(deg / slice);
        if (s !== lastSlice) {
          lastSlice = s;
          const f = flapRef.current;
          if (f) {
            // kick the pointer flapper on every peg
            f.style.transition = "none";
            f.style.transform = "translateX(0) rotate(-22deg)";
            requestAnimationFrame(() => {
              f.style.transition = "transform 90ms ease-out";
              f.style.transform = "translateX(0) rotate(0deg)";
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

  async function playReveal(script: PublicDealScript) {
    setSpinning(true);
    playColorGameSound("deal", 0.9);
    await spinWheelTo(script);
    if (!mountedRef.current) return;
    setWinning(script.winningColor);
    setSpinning(false);
    setLastCredit(script.immediateCredit);
    const hex = cfg.spots.find((s) => s.id === script.winningColor)?.hex ?? "#fbbf24";
    if (script.immediateCredit > 0) {
      const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
      const big = totalBet > 0 && script.immediateCredit / totalBet >= 4;
      playColorGameSound(big ? "bigWin" : "win");
      setBanner(
        `WIN! ${script.winningColor.toUpperCase()} · +₱${script.immediateCredit.toFixed(2)}`,
      );
      setBurst({
        key: Date.now(),
        pieces: makeConfetti(big ? 46 : 26, [hex, "#fbbf24", "#ffffff", "#f472b6", "#38bdf8"]),
        big,
      });
    } else {
      playColorGameSound("lose", 0.8);
      setBanner(`${script.winningColor.toUpperCase()} · no win`);
    }
  }

  async function onDeal() {
    const total = +cfg.spots.reduce((s, sp) => s + (bets[sp.id] ?? 0), 0).toFixed(2);
    if (total < cfg.minBet) {
      toast.error(`Min total bet ₱${cfg.minBet}`);
      return;
    }
    unlockColorGameAudio();
    setBusy(true);
    setWinning(null);
    setBurst(null);
    setLastCredit(0);
    setBanner("Spinning…");
    try {
      const res = await colorGameDealFn({ data: { bets } });
      syncBalance(res.balance);
      await playReveal(res.script);
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
  const winHex = winIdx >= 0 ? cfg.spots[winIdx]!.hex : "#fbbf24";

  const bulbs = useMemo(() => Array.from({ length: BULBS }, (_, i) => i), []);
  const pegs = useMemo(
    () =>
      Array.from({ length: cfg.spots.length }, (_, i) => i * (360 / Math.max(1, cfg.spots.length))),
    [cfg.spots.length],
  );

  return (
    <div className="cg-root relative flex h-full min-h-0 flex-col overflow-hidden text-white">
      <style>{CSS}</style>

      {/* felt table + vignette + perya string lights */}
      <div className="pointer-events-none absolute inset-0 cg-felt" />
      <div className="pointer-events-none absolute inset-x-0 top-0 cg-bunting" />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(2.9rem,calc(env(safe-area-inset-top)+2.4rem))] pr-14 sm:pr-4">
        <div className="min-w-0">
          <div className="cg-title truncate text-[1.15rem] font-black tracking-[0.14em] uppercase">
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase">
            Carnival colors · pays {cfg.spots[0]?.payoutMult ?? 5.5}×
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setColorGameMuted(next);
              if (!next) {
                unlockColorGameAudio();
                playColorGameSound("chip");
              }
            }}
            className="grid size-9 place-items-center rounded-full border border-amber-300/40 bg-black/45 text-amber-200"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {balance != null && (
            <div className="cg-balance rounded-2xl px-3 py-1.5 text-base font-bold tabular-nums">
              ₱{balance.toFixed(2)}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-3 py-1">
        <div
          className="relative mx-auto aspect-square shrink-0"
          style={{
            width: "min(92vw, calc(100dvh - 18.5rem), 27rem)",
            containerType: "inline-size",
          }}
        >
          {/* glow behind wheel */}
          <div
            className={cn("cg-halo absolute -inset-[8%] rounded-full", spinning && "cg-halo-fast")}
            style={{ ["--halo" as string]: winning ? winHex : "#fbbf24" }}
          />

          {/* pointer: big arrow, tip pointing DOWN into the wheel; kicks on every peg */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-30"
            style={{
              transform: "translate(-50%, -52%)",
              filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.65))",
            }}
          >
            <div
              ref={flapRef}
              className="relative origin-top"
              style={{
                width: "clamp(44px, 12.5cqw, 64px)",
                aspectRatio: "0.82",
                transform: "translateX(0) rotate(0deg)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg, #fff7c2 0%, #fbbf24 45%, #b45309 100%)",
                }}
              />
              <div
                className="absolute"
                style={{
                  inset: "9% 17% 26% 17%",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
                }}
              />
              <div className="absolute left-1/2 top-[6%] size-[22%] -translate-x-1/2 rounded-full bg-gradient-to-b from-white to-amber-400 shadow ring-1 ring-amber-700/60" />
            </div>
          </div>

          {/* outer gold rim */}
          <div className="cg-rim absolute inset-0 rounded-full p-[3.2%]">
            {/* marquee bulbs */}
            <div className={cn("absolute inset-0", spinning ? "cg-bulbs-fast" : "cg-bulbs")}>
              {bulbs.map((i) => (
                <span
                  key={i}
                  className="cg-bulb"
                  style={{
                    transform: `rotate(${(360 / BULBS) * i}deg) translateY(calc(-1 * var(--r)))`,
                    animationDelay: `${(i % 2) * 0.45}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative size-full overflow-hidden rounded-full bg-[#060b14] shadow-[inset_0_0_22px_rgba(0,0,0,0.9)]">
              {/* spinning disc */}
              <div
                ref={wheelRef}
                className="absolute inset-[2.5%] rounded-full will-change-transform"
                style={{ background: `conic-gradient(${conic})` }}
              >
                {/* slice dividers */}
                {pegs.map((deg) => (
                  <div
                    key={`d${deg}`}
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${deg}deg)` }}
                  >
                    <div className="absolute left-1/2 top-0 h-1/2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-white/70 via-white/25 to-transparent" />
                    <span className="cg-peg absolute left-1/2 top-[1.2%] -translate-x-1/2" />
                  </div>
                ))}

                {/* winning slice glow (rotates with the disc) */}
                {winIdx >= 0 && (
                  <div
                    className="cg-win-slice pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from ${winIdx * slice}deg, rgba(255,255,255,0.55) 0deg ${slice}deg, transparent ${slice}deg 360deg)`,
                    }}
                  />
                )}

                {cfg.spots.map((sp, i) => {
                  const mid = i * slice + slice / 2;
                  const darkText = sp.id === "white" || sp.id === "yellow";
                  return (
                    <div
                      key={sp.id}
                      className="pointer-events-none absolute inset-0"
                      style={{ transform: `rotate(${mid}deg)` }}
                    >
                      <span
                        className="absolute left-1/2 top-[13%] -translate-x-1/2 text-[0.7rem] font-black uppercase tracking-wider sm:text-sm"
                        style={{
                          color: darkText ? "#0f172a" : "#fff",
                          textShadow: darkText
                            ? "0 1px 0 rgba(255,255,255,0.5)"
                            : "0 1px 3px rgba(0,0,0,0.7)",
                        }}
                      >
                        {sp.label}
                      </span>
                      <span
                        className="absolute left-1/2 top-[24%] -translate-x-1/2 text-[0.55rem] font-bold tabular-nums opacity-80 sm:text-[0.65rem]"
                        style={{ color: darkText ? "#0f172a" : "#fff" }}
                      >
                        {sp.payoutMult}×
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* glass sheen (does not rotate) */}
              <div className="pointer-events-none absolute inset-[2.5%] rounded-full cg-sheen" />

              {/* hub */}
              <div className="cg-hub absolute inset-[31%] z-10 flex items-center justify-center rounded-full">
                {winning ? (
                  <span
                    className="cg-pop text-center text-sm font-black uppercase tracking-wider sm:text-base"
                    style={{ color: winHex, textShadow: "0 0 12px currentColor" }}
                  >
                    {winning}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">
                    {spinning ? "···" : "Spin"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* confetti */}
          {burst && (
            <div key={burst.key} className="pointer-events-none absolute left-1/2 top-1/2 z-40">
              {burst.pieces.map((p) => (
                <span
                  key={p.id}
                  className="cg-confetti"
                  style={{
                    background: p.color,
                    width: p.w,
                    height: p.h,
                    animationDelay: `${p.delay}s`,
                    ["--x" as string]: `${p.x}px`,
                    ["--y" as string]: `${p.y}px`,
                    ["--r" as string]: `${p.rot}deg`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-4 rounded-full px-5 py-1.5 text-center text-sm font-bold tracking-wide backdrop-blur",
            lastCredit > 0
              ? "cg-win-banner bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-300/50"
              : "bg-black/45 text-white/85 ring-1 ring-white/10",
          )}
        >
          {banner}
        </div>
      </div>

      <div className="relative z-20 shrink-0 border-t border-amber-300/20 bg-black/55 backdrop-blur-sm">
        <BettingPanel
          cfg={cfg}
          bets={bets}
          disabled={busy}
          activeSpot={activeSpot}
          winning={winning}
          onActiveSpot={setActiveSpot}
          onBet={onBet}
          onChipPlaced={onChipPlaced}
          onClearAll={clearAll}
          onDeal={() => void onDeal()}
          dealBusy={busy}
        />
      </div>
    </div>
  );
}

const CSS = `
.cg-root { background: #07101f; }
.cg-felt {
  background:
    radial-gradient(ellipse 85% 60% at 50% 38%, rgba(16,120,92,0.55), rgba(6,52,48,0.0) 70%),
    radial-gradient(ellipse 120% 80% at 50% 120%, rgba(0,0,0,0.85), transparent 60%),
    repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px),
    linear-gradient(180deg, #0a2a2c 0%, #071a22 55%, #050c16 100%);
}
.cg-bunting {
  height: 2.4rem; opacity: .95; filter: drop-shadow(0 4px 5px rgba(0,0,0,.55));
  background: repeating-linear-gradient(90deg,
      #ef4444 0 44px, #eab308 44px 88px, #3b82f6 88px 132px,
      #22c55e 132px 176px, #ec4899 176px 220px, #f8fafc 220px 264px);
  /* flags hang from the string: flat top, point DOWN */
  -webkit-mask: conic-gradient(from -30deg at 50% 100%, #000 60deg, transparent 0) 0 0 / 44px 100%;
  mask: conic-gradient(from -30deg at 50% 100%, #000 60deg, transparent 0) 0 0 / 44px 100%;
}
.cg-title {
  background: linear-gradient(180deg, #fff8cf 0%, #fcd34d 45%, #d97706 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.55)) drop-shadow(0 0 10px rgba(251,191,36,.35));
}
.cg-balance {
  background: linear-gradient(180deg, rgba(0,0,0,.65), rgba(20,16,4,.75));
  border: 1px solid rgba(251,191,36,.55);
  box-shadow: inset 0 0 10px rgba(251,191,36,.18), 0 0 14px rgba(251,191,36,.12);
  color: #fde68a;
}
.cg-halo {
  background: radial-gradient(circle, var(--halo) 0%, transparent 62%);
  opacity: .32; filter: blur(14px); animation: cg-breathe 3.2s ease-in-out infinite;
  transition: background .4s;
}
.cg-halo-fast { animation-duration: .7s; opacity: .5; }
@keyframes cg-breathe { 0%,100% { transform: scale(.96); } 50% { transform: scale(1.05); } }
.cg-rim {
  --r: 0px;
  background: linear-gradient(145deg, #fff6c8 0%, #f5d76e 26%, #c98f0a 55%, #8a5a06 80%, #f5d76e 100%);
  box-shadow: 0 22px 50px rgba(0,0,0,.6), inset 0 0 0 2px rgba(255,255,255,.35), inset 0 -6px 14px rgba(90,50,0,.55);
  container-type: size;
}
.cg-bulbs, .cg-bulbs-fast { position: absolute; inset: 0; }
.cg-bulb {
  position: absolute; left: 50%; top: 50%; width: 2.7%; height: 2.7%; margin: -1.35% 0 0 -1.35%;
  border-radius: 9999px; background: radial-gradient(circle at 35% 30%, #fff, #ffe27a 45%, #d98a00);
  box-shadow: 0 0 6px 1px rgba(255,214,90,.9);
  animation: cg-twinkle 0.9s ease-in-out infinite alternate;
  --r: 47.2cqw;
}
.cg-bulbs-fast .cg-bulb { animation-duration: .18s; }
@keyframes cg-twinkle { from { opacity: .35; filter: brightness(.7); } to { opacity: 1; filter: brightness(1.35); } }
.cg-peg {
  width: 3.2%; aspect-ratio: 1; border-radius: 9999px;
  background: radial-gradient(circle at 35% 30%, #fff, #fcd34d 50%, #92400e);
  box-shadow: 0 1px 3px rgba(0,0,0,.7);
}
.cg-sheen {
  background:
    radial-gradient(ellipse 70% 38% at 38% 16%, rgba(255,255,255,.28), transparent 70%),
    radial-gradient(circle, transparent 58%, rgba(0,0,0,.38) 100%);
}
.cg-hub {
  background: radial-gradient(circle at 35% 28%, #24324b, #0b1220 70%);
  border: 3px solid #f5d76e;
  box-shadow: inset 0 8px 18px rgba(0,0,0,.6), 0 0 0 3px rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.6);
}
.cg-win-slice { animation: cg-slice 0.55s ease-in-out infinite alternate; mix-blend-mode: overlay; }
@keyframes cg-slice { from { opacity: .25; } to { opacity: 1; } }
.cg-pop { animation: cg-pop .45s cubic-bezier(.2,1.6,.4,1); }
@keyframes cg-pop { from { transform: scale(.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.cg-win-banner { animation: cg-banner .6s cubic-bezier(.2,1.5,.4,1); box-shadow: 0 0 22px rgba(52,211,153,.45); }
@keyframes cg-banner { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.cg-confetti {
  position: absolute; left: 0; top: 0; border-radius: 2px; opacity: 0;
  animation: cg-fly 1.5s cubic-bezier(.15,.7,.3,1) forwards;
}
@keyframes cg-fly {
  0% { transform: translate(0,0) rotate(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(var(--x), calc(var(--y) + 140px)) rotate(var(--r)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cg-halo, .cg-bulb, .cg-win-slice, .cg-confetti { animation: none; }
}
`;
