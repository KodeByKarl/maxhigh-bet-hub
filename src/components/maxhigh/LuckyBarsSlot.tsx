/**
 * Lucky Bars slot UI — classic 3-reel cabinet with hold buttons.
 * Non-authoritative: outcomes from luckyBarsSpinFn only.
 * Playback is a phase sequencer: spin → staggered land → win/JP → bonus → idle.
 * Explicitly NO autoplay, free spins, scatters, or bonus buy.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import {
  getLuckyBarsEngineConfigFn,
  getLuckyBarsJackpotFn,
  luckyBarsSpinFn,
} from "@/functions/api";
import { useAuth } from "@/lib/auth";
import { LUCKY_BARS_GAME_ID, type LuckyBarsConfig } from "@/lib/lucky-bars-config";
import { cn } from "@/lib/utils";
import { ANIM, BLUR_SYMBOLS, ICON_SRC, SYM_NAME } from "./lucky-bars/animationConfig";
import { LuckyBarsIcon } from "./lucky-bars/LuckyBarsIcon";
import { PaytableModal } from "./lucky-bars/PaytableModal";
import { getLuckyBarsConfig, setLuckyBarsConfig } from "./lucky-bars/runtimeConfig";
import type { RrReels, SpinScript } from "./lucky-bars/types";

type Phase = "idle" | "spinning" | "landing" | "result" | "jackpot" | "bonus" | "outro";

function idleReels(): RrReels {
  return ["cherry", "apple", "banana"];
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Ease jackpot / last-win readout without jarring jumps. */
function useSmoothNumber(target: number, ms = 480) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, ms]);

  return value;
}

type ReelViewProps = {
  index: number;
  symbol: string;
  held: boolean;
  spinning: boolean;
  landed: boolean;
  winning: boolean;
  phase: Phase;
  canHoldWild: boolean;
  locked: boolean;
  onToggleHold: () => void;
};

const SPIN_STRIP = [...BLUR_SYMBOLS, ...BLUR_SYMBOLS] as const;
const SPIN_CELL_PCT = 100 / SPIN_STRIP.length;

function ReelWindow({
  index,
  symbol,
  held,
  spinning,
  landed,
  winning,
}: Omit<ReelViewProps, "canHoldWild" | "locked" | "onToggleHold" | "phase">) {
  const isSpinning = spinning && !held;

  return (
    <div
      className={cn(
        "rr-window relative aspect-[3/4] w-full max-w-[11.5rem] flex-1 transition-[box-shadow,transform] duration-300 ease-out sm:max-w-[14rem] md:max-w-[15.5rem]",
        held && "rr-window-held",
        winning && "rr-win-pulse rr-window-win",
        landed && !winning && "rr-land",
      )}
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[1rem] bg-gradient-to-b from-[#2a1048] via-[#4c1d95] to-[#831843]">
        {isSpinning ? (
          <div className="absolute inset-0 z-[1]">
            <div
              className="rr-blur-strip absolute left-0 top-0 w-full"
              style={{ height: `${SPIN_STRIP.length * 100}%` }}
            >
              {SPIN_STRIP.map((s, i) => (
                <div
                  key={`${s}-${i}`}
                  className="flex w-full shrink-0 items-center justify-center"
                  style={{ height: `${SPIN_CELL_PCT}%` }}
                >
                  <img
                    src={ICON_SRC[s]}
                    alt=""
                    draggable={false}
                    className="rr-blur-sym size-[88%] object-contain object-center"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            key={symbol}
            className={cn(
              "rr-symbol-in absolute inset-0 z-[1] flex items-center justify-center",
              landed && "rr-symbol-settle",
            )}
          >
            <LuckyBarsIcon
              kind={symbol}
              framed={false}
              showLabel
              label={SYM_NAME[symbol]}
              className="size-full"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[4] rounded-[1rem] shadow-[inset_0_2px_12px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.2)]" />
        <div className="pointer-events-none absolute inset-x-2 top-1 z-[5] h-10 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
      </div>

      {held && (
        <div className="absolute left-1.5 top-1.5 z-20 rounded-full bg-lime-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-lime-950 shadow-[0_0_12px_rgba(163,230,53,0.55)]">
          Held
        </div>
      )}
    </div>
  );
}

function HoldButton({
  held,
  locked,
  holdBlocked,
  onToggleHold,
}: {
  held: boolean;
  locked: boolean;
  holdBlocked: boolean;
  onToggleHold: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked || holdBlocked}
      onClick={onToggleHold}
      className={cn(
        "rr-hold-btn w-full max-w-[11.5rem] flex-1 py-2.5 text-xs font-bold uppercase tracking-[0.18em] sm:max-w-[14rem] sm:text-sm md:max-w-[15.5rem]",
        held ? "rr-hold-active" : "rr-hold-idle",
        holdBlocked && "cursor-not-allowed opacity-40",
      )}
    >
      {holdBlocked ? "No Hold" : held ? "Held" : "Hold"}
    </button>
  );
}

export function LuckyBarsSlot({
  gameId: _gameId = LUCKY_BARS_GAME_ID,
  gameName = "Lucky Bars",
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [held, setHeld] = useState<boolean[]>([false, false, false]);
  const [reels, setReels] = useState<RrReels>(idleReels);
  const [phase, setPhase] = useState<Phase>("idle");
  const [spinningMask, setSpinningMask] = useState<boolean[]>([false, false, false]);
  const [landedMask, setLandedMask] = useState<boolean[]>([false, false, false]);
  const [winMask, setWinMask] = useState<boolean[]>([false, false, false]);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [jpPool, setJpPool] = useState(0);
  const [jpCelebrate, setJpCelebrate] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusLineIdx, setBonusLineIdx] = useState(-1);
  const [bonusRunning, setBonusRunning] = useState(0);
  const [bonusSession, setBonusSession] = useState<SpinScript["bonus"]>(null);
  const [cfgSnap, setCfgSnap] = useState<LuckyBarsConfig>(() => getLuckyBarsConfig());
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const lockedRef = useRef(false);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const autoRef = useRef(autoSpin);
  const turboRef = useRef(turbo);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startSpinRef = useRef<() => void>(() => undefined);

  autoRef.current = autoSpin;
  turboRef.current = turbo;

  const smoothJp = useSmoothNumber(jpPool, 700);
  const smoothLast = useSmoothNumber(lastWin, 420);
  const locked = phase !== "idle";

  const waitMs = useCallback((ms: number) => {
    const scaled = turboRef.current ? Math.max(40, Math.round(ms * 0.38)) : ms;
    return wait(scaled);
  }, []);

  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const stopAuto = () => {
    setAutoSpin(false);
    autoRef.current = false;
    clearAutoTimer();
  };

  const queueAutoSpin = () => {
    clearAutoTimer();
    if (!autoRef.current || !mountedRef.current) return;
    autoTimerRef.current = setTimeout(
      () => startSpinRef.current(),
      turboRef.current ? 120 : 420,
    );
  };

  useEffect(() => {
    mountedRef.current = true;
    if (typeof Image !== "undefined") {
      for (const src of Object.values(ICON_SRC)) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    }
    void Promise.all([getLuckyBarsEngineConfigFn(), getLuckyBarsJackpotFn()])
      .then(([cfg, jp]) => {
        if (!mountedRef.current) return;
        setLuckyBarsConfig(cfg);
        setCfgSnap(getLuckyBarsConfig());
        setJpPool(jp.amount);
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      clearAutoTimer();
    };
  }, []);

  const showBanner = useCallback(async (text: string | null, runId: number) => {
    setBannerVisible(false);
    await waitMs(ANIM.bannerFadeMs);
    if (runId !== runIdRef.current || !mountedRef.current) return;
    setBanner(text);
    if (text) {
      requestAnimationFrame(() => {
        if (runId === runIdRef.current) setBannerVisible(true);
      });
    }
  }, [waitMs]);

  const toggleHold = (i: number) => {
    if (lockedRef.current || autoRef.current) return;
    setHeld((h) => h.map((v, idx) => (idx === i ? !v : v)));
  };

  const playScript = useCallback(
    async (script: SpinScript, runId: number) => {
      const heldSnap = [...script.held];
      setHeld(heldSnap);

      setPhase("spinning");
      setWinMask([false, false, false]);
      setLandedMask([false, false, false]);
      setBonusOpen(false);
      setBonusSession(null);
      setBonusLineIdx(-1);
      setBonusRunning(0);
      setJpCelebrate(false);
      await showBanner(null, runId);
      setSpinningMask(heldSnap.map((h) => !h));

      await waitMs(ANIM.spinLeadMs);
      if (runId !== runIdRef.current || !mountedRef.current) return;

      setPhase("landing");
      for (let i = 0; i < 3; i++) {
        if (runId !== runIdRef.current || !mountedRef.current) return;
        if (heldSnap[i]) {
          setLandedMask((m) => {
            const n = [...m];
            n[i] = true;
            return n;
          });
          continue;
        }
        await waitMs(ANIM.reelStaggerMs);
        if (runId !== runIdRef.current || !mountedRef.current) return;
        setReels((prev) => {
          const next = [...prev] as RrReels;
          next[i] = script.reels[i]!;
          return next;
        });
        setSpinningMask((m) => {
          const n = [...m];
          n[i] = false;
          return n;
        });
        setLandedMask((m) => {
          const n = [...m];
          n[i] = true;
          return n;
        });
      }
      setReels(script.reels);
      await waitMs(ANIM.landSettleMs);
      if (runId !== runIdRef.current || !mountedRef.current) return;

      setPhase("result");
      if (script.payline.kind === "fruit" || script.payline.kind === "two_wild") {
        setWinMask([true, true, true]);
        const label =
          script.payline.kind === "two_wild"
            ? `DOUBLE WILD ×2 · ${formatMoney(script.payline.payout)}`
            : `${SYM_NAME[script.payline.symbol!]} ×3 · ${formatMoney(script.payline.payout)}`;
        await showBanner(label, runId);
        await waitMs(ANIM.winHoldMs);
      }

      if (script.jackpot.triggered) {
        if (runId !== runIdRef.current || !mountedRef.current) return;
        setPhase("jackpot");
        setJpCelebrate(true);
        setJpPool(script.jackpot.amount);
        await showBanner(`PROGRESSIVE JACKPOT! ${formatMoney(script.jackpot.amount)}`, runId);
        await waitMs(ANIM.jackpotMs * 0.55);
        setJpPool(script.jackpot.poolAfterReset);
        await waitMs(ANIM.jackpotMs * 0.45);
        setJpCelebrate(false);
      }

      if (script.bonus?.triggered) {
        if (runId !== runIdRef.current || !mountedRef.current) return;
        setPhase("bonus");
        setBonusSession(script.bonus);
        setBonusOpen(true);
        await showBanner("BONUS LADDER", runId);
        await waitMs(ANIM.bonusOverlayMs);

        let running = 0;
        for (let i = 0; i < script.bonus.steps.length; i++) {
          if (runId !== runIdRef.current || !mountedRef.current) return;
          const step = script.bonus.steps[i]!;
          setBonusLineIdx(i);
          if (step.outcome === "number") {
            running += step.value;
            setBonusRunning(running);
            await showBanner(`Line ${step.lineIndex + 1} · ×${step.value}`, runId);
          } else {
            await showBanner(`Line ${step.lineIndex + 1} · STOP`, runId);
          }
          await waitMs(ANIM.bonusLineMs);
        }
        await showBanner(`BONUS ${formatMoney(script.bonus.payout)}`, runId);
        await waitMs(ANIM.winHoldMs);
        setBonusOpen(false);
        await waitMs(ANIM.bonusOverlayMs);
      }

      if (runId !== runIdRef.current || !mountedRef.current) return;
      setPhase("outro");
      setLastWin(script.totalWin);
      setWinMask([false, false, false]);
      if (script.totalWin > 0 && !script.jackpot.triggered && !script.bonus) {
        await showBanner(`WIN ${formatMoney(script.totalWin)}`, runId);
      } else if (script.totalWin === 0) {
        await showBanner(null, runId);
      }
      await waitMs(ANIM.outroMs);

      setHeld([false, false, false]);
      setLandedMask([false, false, false]);
      setPhase("idle");
      lockedRef.current = false;
    },
    [showBanner, waitMs],
  );

  const startSpin = async () => {
    if (lockedRef.current) return;
    if (bet > balance) {
      toast.error("Insufficient balance");
      stopAuto();
      return;
    }
    lockedRef.current = true;
    clearAutoTimer();
    const runId = ++runIdRef.current;
    try {
      const result = await luckyBarsSpinFn({
        data: {
          bet,
          held: autoRef.current ? [false, false, false] : held,
          previousReels: reels,
        },
      });
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setBalanceLocal(result.balance);
      if (!result.script.jackpot.triggered) {
        setJpPool(result.jackpotPool);
      }
      await playScript(result.script, runId);
      if (mountedRef.current && runId === runIdRef.current && autoRef.current) {
        queueAutoSpin();
      }
    } catch (e) {
      lockedRef.current = false;
      setPhase("idle");
      setSpinningMask([false, false, false]);
      stopAuto();
      toast.error(e instanceof Error ? e.message : "Spin failed");
    }
  };
  startSpinRef.current = () => {
    void startSpin();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden text-white">
      <style>{LUCKY_BARS_CSS}</style>

      <img
        src="/games/lucky-bars.webp"
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/45 via-[#db2777]/35 to-[#ea580c]/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(76,29,149,0.45)_100%)]" />
      <div className="rr-confetti pointer-events-none absolute inset-0 opacity-50" />

      <header className="relative z-10 flex flex-col items-center gap-2 px-4 pt-3 pb-1 text-center sm:gap-2.5 sm:px-6 sm:pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">
          MaxHigh
        </p>
        <div className="flex items-center justify-center gap-2">
          <h1 className="rr-title text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            {gameName}
          </h1>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="mt-1 flex size-8 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-cyan-400/25 text-white shadow-lg shadow-fuchsia-500/30 hover:bg-cyan-400/40"
            title="How to Win"
            aria-label="How to Win"
          >
            <Info className="size-4" />
          </button>
        </div>
        <div className="rr-chip rounded-2xl px-5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-100/80">
            Balance
          </div>
          <div className="text-lg font-bold tabular-nums text-white sm:text-xl">
            {formatMoney(balance)}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[40rem] flex-col items-center px-3 sm:px-4">
        <div
          className={cn(
            "rr-jackpot mb-2 w-full px-5 py-3 text-center transition-all duration-500 sm:mb-3 sm:py-3.5",
            jpCelebrate && "rr-jp-burst",
          )}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/90">
            Progressive Jackpot
          </div>
          <div className="mt-0.5 text-3xl font-black tabular-nums tracking-tight text-white drop-shadow sm:text-4xl">
            {formatMoney(smoothJp)}
          </div>
          <div className="mt-1 text-[11px] text-white/75">
            Max bet ({cfgSnap.maxBet}) + 2× Double Wild
          </div>
        </div>

        <div className="relative mb-2 flex h-9 w-full items-center justify-center sm:h-10">
          <div
            className={cn(
              "absolute inset-x-0 rounded-full bg-white/15 px-4 py-2 text-center text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur-md",
              "transition-all duration-200 ease-out",
              bannerVisible && banner
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0",
            )}
          >
            {banner ?? "\u00a0"}
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[56rem] flex-1 flex-col items-center justify-center px-3 sm:px-5">
        <div className="rr-stage w-full px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.28em] text-white/80 sm:mb-4">
            ★ Lucky Bars Reels ★
          </div>
          <div className="rr-bay mx-auto flex w-full max-w-[42rem] items-stretch justify-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4 md:gap-5">
            {reels.map((sym, i) => (
              <ReelWindow
                key={i}
                index={i}
                symbol={sym}
                held={held[i]!}
                spinning={spinningMask[i]!}
                landed={landedMask[i]!}
                winning={winMask[i]!}
              />
            ))}
          </div>
          <div className="mx-auto mt-3 flex w-full max-w-[42rem] items-stretch justify-center gap-3 sm:mt-4 sm:gap-4 md:gap-5">
            {reels.map((sym, i) => (
              <HoldButton
                key={i}
                held={held[i]!}
                locked={locked || autoSpin}
                holdBlocked={!cfgSnap.allowHoldWild && sym === "double_wild"}
                onToggleHold={() => toggleHold(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-30 flex items-end justify-center bg-black/0 pb-28 transition-all duration-300 ease-out sm:items-center sm:pb-0",
          bonusOpen && "pointer-events-auto bg-fuchsia-950/55 backdrop-blur-[2px]",
        )}
      >
        <div
          className={cn(
            "rr-chip mx-4 w-full max-w-md rounded-3xl p-5",
            "transition-all duration-300 ease-out",
            bonusOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-6 scale-95 opacity-0",
          )}
        >
          <div className="text-center text-xs font-black uppercase tracking-[0.24em] text-yellow-200">
            Bonus Ladder
          </div>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((line) => {
              const step = bonusSession?.steps.find((s) => s.lineIndex === line);
              const active = bonusLineIdx === line;
              const done = bonusLineIdx > line || (step && bonusLineIdx >= 0 && line < bonusLineIdx);
              return (
                <div
                  key={line}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                    active && "bg-yellow-300 text-purple-950 shadow-[0_0_16px_rgba(253,224,71,0.5)]",
                    !active && done && "bg-white/15 text-white ring-1 ring-white/20",
                    !active && !done && "bg-white/5 text-white/40 ring-1 ring-white/10",
                  )}
                >
                  <span className="font-bold">Line {line + 1}</span>
                  <span className="font-black tabular-nums">
                    {step
                      ? step.outcome === "stop"
                        ? "STOP"
                        : `×${step.value}`
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-lg font-black tabular-nums text-yellow-100">
            Running ×{bonusRunning}
            {bonusSession ? ` · ${formatMoney(bonusSession.payout)}` : ""}
          </div>
        </div>
      </div>

      <footer className="relative z-10 mt-auto border-t border-white/20 bg-gradient-to-r from-fuchsia-700/85 via-purple-800/85 to-orange-600/85 px-4 py-3 backdrop-blur-md sm:py-4">
        <div className="mx-auto flex w-full max-w-[44rem] flex-col items-center gap-2.5">
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <div className="rr-chip flex items-center gap-1 rounded-2xl px-1.5 py-1">
              <button
                type="button"
                disabled={locked || autoSpin || bet <= cfgSnap.minBet}
                onClick={() => setBet((b) => Math.max(cfgSnap.minBet, b - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-black transition hover:bg-white/30 active:scale-95 disabled:opacity-40"
              >
                −
              </button>
              <div className="min-w-[3.25rem] text-center">
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/70">Bet</div>
                <div className="text-base font-black tabular-nums">{bet}</div>
              </div>
              <button
                type="button"
                disabled={locked || autoSpin || bet >= cfgSnap.maxBet}
                onClick={() => setBet((b) => Math.min(cfgSnap.maxBet, b + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-black transition hover:bg-white/30 active:scale-95 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={locked || autoSpin}
              onClick={() => setBet(cfgSnap.maxBet)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider",
                bet >= cfgSnap.maxBet
                  ? "border-yellow-300 bg-yellow-400 text-purple-950"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20",
                "disabled:opacity-40",
              )}
            >
              Max
            </button>

            <button
              type="button"
              onClick={() => setTurbo((t) => !t)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider",
                turbo
                  ? "border-orange-300 bg-gradient-to-b from-orange-400 to-rose-500 text-white"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              Turbo
            </button>

            <button
              type="button"
              disabled={locked && !autoSpin}
              onClick={() => void startSpin()}
              className={cn(
                "rr-spin min-w-[7.5rem] px-8 py-3 text-sm font-black uppercase tracking-[0.16em] text-purple-950 sm:min-w-[8.5rem] sm:px-10 sm:text-base",
                locked && !autoSpin && "opacity-50",
                phase === "spinning" && "rr-spin-btn",
              )}
            >
              {phase === "idle" ? "Spin" : "…"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoSpin((on) => {
                  const next = !on;
                  autoRef.current = next;
                  if (next) {
                    setHeld([false, false, false]);
                    setTimeout(() => startSpinRef.current(), 40);
                  } else {
                    clearAutoTimer();
                  }
                  return next;
                });
              }}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase tracking-wider",
                autoSpin
                  ? "border-yellow-300 bg-gradient-to-b from-yellow-300 to-orange-500 text-purple-950"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              {autoSpin ? "Stop" : "Auto"}
            </button>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-cyan-300/60 bg-gradient-to-b from-cyan-400/30 to-fuchsia-500/30 px-2.5 text-white hover:from-cyan-400/45 hover:to-fuchsia-500/45"
              title="How to Win · Paytable · Patterns"
              aria-label="How to Win / Info"
            >
              <Info className="size-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider">Info</span>
            </button>
          </div>

          <div className="text-center text-[11px] font-semibold text-white/75">
            Last win{" "}
            <span className="tabular-nums text-yellow-200">{formatMoney(smoothLast)}</span>
          </div>
        </div>
      </footer>

      <PaytableModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

const LUCKY_BARS_CSS = `
@keyframes rr-strip-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@keyframes rr-symbol-in {
  0% { opacity: 0; transform: translateY(14px) scale(0.9); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes rr-symbol-settle {
  0% { transform: translateY(-6px); }
  60% { transform: translateY(2px); }
  100% { transform: translateY(0); }
}
@keyframes rr-win-pulse {
  0%, 100% { filter: brightness(1); transform: scale(1); }
  50% { filter: brightness(1.12); transform: scale(1.02); }
}
@keyframes rr-jp-burst {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
}
@keyframes rr-spin-btn {
  0%, 100% { box-shadow: 0 8px 24px rgba(250, 204, 21, 0.45); }
  50% { box-shadow: 0 8px 32px rgba(250, 204, 21, 0.7), 0 0 0 8px rgba(250,204,21,0.18); }
}
@keyframes rr-float-dots {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.rr-blur-strip {
  animation: rr-strip-scroll 0.32s linear infinite;
  will-change: transform;
}
.rr-blur-sym {
  filter: blur(0.55px) saturate(1.08);
  flex-shrink: 0;
}
.rr-symbol-in {
  animation: rr-symbol-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.rr-symbol-settle {
  animation: rr-symbol-settle 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}
.rr-win-pulse {
  animation: rr-win-pulse 0.7s ease-in-out infinite;
}
.rr-jp-burst {
  animation: rr-jp-burst 0.55s ease-in-out infinite;
}
.rr-spin-btn {
  animation: rr-spin-btn 0.9s ease-out infinite;
}
.rr-land {
  transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.rr-confetti {
  background-image:
    radial-gradient(circle at 12% 18%, #ffe566 0 3px, transparent 4px),
    radial-gradient(circle at 78% 22%, #7CFC9A 0 2px, transparent 3px),
    radial-gradient(circle at 30% 70%, #5eead4 0 2px, transparent 3px),
    radial-gradient(circle at 88% 68%, #ff6bcb 0 3px, transparent 4px),
    radial-gradient(circle at 55% 40%, #b388ff 0 2px, transparent 3px);
  background-size: 52px 52px, 40px 40px, 48px 48px, 36px 36px, 44px 44px;
  animation: rr-float-dots 5s ease-in-out infinite;
}
.rr-title {
  background-image: linear-gradient(90deg, #ffe566, #ff9f1c, #ff4d9e, #a78bfa, #34d399, #38bdf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 3px 10px rgba(0,0,0,0.35));
}
.rr-jackpot {
  border-radius: 1.25rem;
  background: linear-gradient(135deg, #ff4d9e 0%, #c026d3 45%, #f59e0b 100%);
  border: 2px solid rgba(255,255,255,0.55);
  box-shadow: 0 10px 28px rgba(219, 39, 119, 0.45), inset 0 1px 0 rgba(255,255,255,0.35);
}
.rr-stage {
  border-radius: 1.75rem;
  background: linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(244,114,182,0.35) 40%, rgba(147,51,234,0.4) 100%);
  border: 2px solid rgba(255,255,255,0.45);
  box-shadow: 0 18px 40px rgba(124, 58, 237, 0.35), inset 0 1px 0 rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
}
.rr-bay {
  background: rgba(15, 5, 30, 0.35);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: inset 0 8px 24px rgba(0,0,0,0.25);
}
.rr-window {
  border-radius: 1.15rem;
  padding: 4px;
  background: linear-gradient(145deg, #ffe566, #ff4d9e, #a78bfa, #34d399);
  box-shadow: 0 8px 20px rgba(219, 39, 119, 0.35);
}
.rr-window-held {
  box-shadow: 0 0 0 3px #86efac, 0 0 22px rgba(132, 204, 22, 0.55);
}
.rr-window-win {
  box-shadow: 0 0 0 3px #fde68a, 0 0 26px rgba(250, 204, 21, 0.65);
}
.rr-hold-btn {
  border-radius: 9999px;
  border: 2px solid rgba(255,255,255,0.65);
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.2s ease;
}
.rr-hold-btn:active:not(:disabled) { transform: scale(0.97); }
.rr-hold-idle {
  color: white;
  background: linear-gradient(180deg, #ff6bcb 0%, #c026d3 100%);
  box-shadow: 0 6px 16px rgba(192, 38, 211, 0.4);
}
.rr-hold-idle:hover:not(:disabled) { filter: brightness(1.08); }
.rr-hold-active {
  color: #14532d;
  background: linear-gradient(180deg, #bef264 0%, #22c55e 100%);
  box-shadow: 0 0 0 3px rgba(190, 242, 100, 0.55), 0 6px 18px rgba(34, 197, 94, 0.45);
}
.rr-chip {
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.28);
  box-shadow: 0 8px 22px rgba(0,0,0,0.18);
  backdrop-filter: blur(12px);
}
.rr-spin {
  border-radius: 9999px;
  background: linear-gradient(180deg, #ffe566 0%, #fb923c 55%, #f43f5e 100%);
  border: 3px solid white;
  box-shadow: 0 8px 24px rgba(251, 146, 60, 0.5);
  transition: transform 0.12s ease, filter 0.15s ease;
}
.rr-spin:hover:not(:disabled) { filter: brightness(1.06); }
.rr-spin:active:not(:disabled) { transform: scale(0.97); }
`;
