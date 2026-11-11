import { FireControls as SlotControlDeck } from "./fire-spike/FireControls";
/**
 * Fire Spike slot UI — owns its own spin state machine.
 * No shared async playback from other games (CNY / Mahjong / Frontier).
 *
 * Flow: idle → api → step[0..n] (timers) → idle → (auto?) next
 * A single runId cancels stale timers. Highlights clear on every step change + on done.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fireSpikeSpinFn, getFireSpikeEngineConfigFn } from "@/functions/api";
import { useAuth } from "@/lib/auth";
import { FIRE_SPIKE_GAME_ID, type FireSpikeConfig, type FsSymKind } from "@/lib/fire-spike-config";
import { cn } from "@/lib/utils";
import { BET_STEPS, ANIM } from "./fire-spike/animationConfig";
import { ReelCell, type ReelPhase } from "./fire-spike/ReelCell";
import { getFireSpikeConfig, setFireSpikeConfig } from "./fire-spike/runtimeConfig";
import { planFireSpikePlayback, type FsPlaybackStep } from "./fire-spike/spinPlayback";
import { fireSpikeAudio } from "./fire-spike/audio";
import { cellKey, type FsGrid } from "./fire-spike/types";

function idleGrid(): FsGrid {
  const cfg = getFireSpikeConfig();
  const kinds: FsSymKind[] = ["bar", "dice", "diamond", "chip", "lucky7"];
  return Array.from({ length: cfg.reelsCount }, (_, reel) =>
    Array.from({ length: cfg.rowsCount }, (_, row) => kinds[(reel + row) % kinds.length]!),
  );
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type UiSnap = {
  phase: ReelPhase;
  grid: FsGrid;
  winKeys: string[];
  mixKeys: string[];
  banner: string | null;
  popup: number | null;
  jackpot: boolean;
  /** Soft fade-out of win ring / banner (not a hard cut). */
  fading: boolean;
  lastWin: number;
  spinId: number;
  locked: boolean;
};

const INITIAL_UI = (): UiSnap => ({
  phase: "idle",
  grid: idleGrid(),
  winKeys: [],
  mixKeys: [],
  banner: null,
  popup: null,
  jackpot: false,
  fading: false,
  lastWin: 0,
  spinId: 0,
  locked: false,
});

const getCfgReels = () => getFireSpikeConfig().reelsCount;

export function FireSpikeSlot({
  gameId = FIRE_SPIKE_GAME_ID,
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [muted, setMuted] = useState(() => fireSpikeAudio.isMuted);
  const [cfgSnap, setCfgSnap] = useState<FireSpikeConfig>(() => getFireSpikeConfig());
  const [ui, setUi] = useState<UiSnap>(INITIAL_UI);

  const runIdRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const autoRef = useRef(autoSpin);
  const turboRef = useRef(turbo);
  const betRef = useRef(bet);
  const startSpinRef = useRef<() => void>(() => undefined);

  autoRef.current = autoSpin;
  turboRef.current = turbo;
  betRef.current = bet;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const applyIdle = useCallback((lastWin?: number) => {
    lockedRef.current = false;
    setUi((prev) => ({
      ...prev,
      phase: "idle",
      winKeys: [],
      mixKeys: [],
      banner: null,
      popup: null,
      jackpot: false,
      fading: false,
      locked: false,
      lastWin: lastWin !== undefined ? lastWin : prev.lastWin,
    }));
  }, []);

  const scheduleContinue = useCallback((reason: "auto" | "win") => {
    clearAutoTimer();
    if (!mountedRef.current) return;
    // Auto mode: always chain. Manual: only after a win (another paid chance).
    if (reason === "auto" && !autoRef.current) return;
    autoTimerRef.current = setTimeout(
      () => {
        autoTimerRef.current = null;
        if (!mountedRef.current || lockedRef.current) return;
        if (reason === "auto" && !autoRef.current) return;
        startSpinRef.current();
      },
      turboRef.current ? 150 : 500,
    );
  }, []);

  const fadeOutWin = useCallback((runId: number, then: () => void) => {
    setUi((prev) => ({ ...prev, fading: true }));
    const fadeMs = turboRef.current ? 120 : ANIM.winFade;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (runId !== runIdRef.current) return;
      setUi((prev) => ({
        ...prev,
        winKeys: [],
        mixKeys: [],
        banner: null,
        popup: null,
        jackpot: false,
        fading: false,
      }));
      then();
    }, fadeMs);
  }, []);

  /** Run one playback step; schedules the next via setTimeout (no async/await chain). */
  const runStep = useCallback(
    (runId: number, steps: FsPlaybackStep[], index: number) => {
      if (!mountedRef.current || runId !== runIdRef.current) return;

      const step = steps[index];
      if (!step) {
        applyIdle();
        if (autoRef.current) scheduleContinue("auto");
        return;
      }

      if (step.type === "spinning") {
        setUi((prev) => ({
          ...prev,
          phase: "spinning",
          winKeys: [],
          mixKeys: [],
          banner: null,
          popup: null,
          jackpot: false,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "stopping") {
        setUi((prev) => ({
          ...prev,
          phase: "stopping",
          grid: step.grid,
          winKeys: [],
          mixKeys: [],
          banner: null,
          popup: null,
          jackpot: false,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "highlight_lines") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: step.keys,
          mixKeys: [],
          banner: step.label,
          popup: step.amount,
          jackpot: false,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "highlight_mix") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: [],
          mixKeys: step.keys,
          banner: step.label,
          popup: step.amount,
          jackpot: false,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "highlight_jackpot") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: [],
          mixKeys: [],
          banner: step.label,
          popup: step.amount,
          jackpot: true,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "tally") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: [],
          mixKeys: [],
          banner: step.label,
          popup: step.amount,
          jackpot: false,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "done") {
        const won = step.totalWin > 0;
        fadeOutWin(runId, () => {
          applyIdle(step.totalWin);
          if (autoRef.current) scheduleContinue("auto");
          else if (won) scheduleContinue("win");
        });
        return;
      }

      switch (step.type) {
        case "spinning":
          fireSpikeAudio.startAmbient();
          fireSpikeAudio.startSpinLoop();
          break;
        case "stopping": {
          fireSpikeAudio.stopSpinLoop();
          const reels = getCfgReels();
          for (let r = 0; r < reels; r++) {
            setTimeout(() => {
              if (mountedRef.current && runId === runIdRef.current) fireSpikeAudio.playReelStop(r);
            }, r * 90);
          }
          break;
        }
        case "highlight_lines":
        case "highlight_mix":
        case "tally":
          fireSpikeAudio.playWin(step.amount, betRef.current);
          break;
        case "highlight_jackpot":
          fireSpikeAudio.playScatterTrigger();
          fireSpikeAudio.playWin(step.amount, betRef.current);
          break;
        default:
          break;
      }

      const ms = "ms" in step ? step.ms : 0;
      clearTimer();
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          if (runId !== runIdRef.current) return;
          const isCelebrate =
            step.type === "highlight_lines" ||
            step.type === "highlight_mix" ||
            step.type === "highlight_jackpot" ||
            step.type === "tally";
          if (isCelebrate) {
            fadeOutWin(runId, () => runStep(runId, steps, index + 1));
            return;
          }
          runStep(runId, steps, index + 1);
        },
        Math.max(16, ms),
      );
    },
    [applyIdle, fadeOutWin, scheduleContinue],
  );

  const startSpin = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    clearTimer();
    clearAutoTimer();
    const runId = ++runIdRef.current;
    const stake = betRef.current;

    setUi((prev) => ({
      ...prev,
      locked: true,
      phase: "spinning",
      winKeys: [],
      mixKeys: [],
      banner: null,
      popup: null,
      jackpot: false,
      fading: false,
      spinId: prev.spinId + 1,
    }));

    void (async () => {
      try {
        const res = await fireSpikeSpinFn({ data: { bet: stake } });
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setBalanceLocal(res.balance);
        const cfg = getFireSpikeConfig();
        const steps = planFireSpikePlayback(res.script, cfg.reelsCount, turboRef.current);
        runStep(runId, steps, 0);
      } catch (e) {
        if (runId !== runIdRef.current) return;
        const msg = e instanceof Error ? e.message : "Spin failed";
        toast.error(msg);
        fireSpikeAudio.stopSpinLoop();
        setAutoSpin(false);
        applyIdle();
      }
    })();
  }, [applyIdle, runStep, setBalanceLocal]);

  startSpinRef.current = startSpin;

  useEffect(() => {
    mountedRef.current = true;
    fireSpikeAudio.preload();
    void getFireSpikeEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        const next = setFireSpikeConfig(cfg);
        setCfgSnap(next);
        setUi((prev) => (prev.locked ? prev : { ...prev, grid: idleGrid() }));
        setBet((b) => Math.max(next.minBet, Math.min(next.maxBet, b)));
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      fireSpikeAudio.stopSpinLoop();
      fireSpikeAudio.stopAmbient();
      runIdRef.current += 1;
      clearTimer();
      clearAutoTimer();
    };
  }, []);

  // Watchdog: if locked longer than 12s, force unlock (API hang / bad timer)
  useEffect(() => {
    if (!ui.locked) return;
    const id = setTimeout(() => {
      console.warn("[FireSpike] watchdog unlock — spin exceeded 12s");
      runIdRef.current += 1;
      fireSpikeAudio.stopSpinLoop();
      clearTimer();
      lockedRef.current = false;
      applyIdle();
      if (autoRef.current) scheduleContinue("auto");
    }, 12_000);
    return () => clearTimeout(id);
  }, [ui.locked, ui.spinId, applyIdle, scheduleContinue]);

  const cfg = cfgSnap;
  const stepIdx = BET_STEPS.findIndex((s) => s >= bet);
  const busy = ui.locked;
  const winKeySet = new Set(ui.winKeys);
  const mixKeySet = new Set(ui.mixKeys);

  function nudgeBet(dir: -1 | 1) {
    if (dir < 0) {
      const idx = Math.max(0, (stepIdx <= 0 ? 0 : stepIdx) - 1);
      const prev = BET_STEPS[idx] ?? cfg.minBet;
      setBet(Math.max(cfg.minBet, Math.min(cfg.maxBet, prev)));
      return;
    }
    const idx = BET_STEPS.findIndex((s) => s > bet);
    const next = BET_STEPS[idx >= 0 ? idx : BET_STEPS.length - 1] ?? cfg.maxBet;
    setBet(Math.max(cfg.minBet, Math.min(cfg.maxBet, next)));
  }

  return (
    <div
      data-fs-shell
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#120806] text-white"
    >
      <style>{`
        @keyframes fs-reel-scroll-kf {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes fs-reel-land-kf {
          from { transform: translateY(-120%); opacity: 0.35; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fs-win-pulse-kf {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .fs-reel-scroll { animation: fs-reel-scroll-kf 0.22s linear infinite; }
        .fs-reel-land { animation: fs-reel-land-kf 0.35s ease-out both; }
        .fs-win-pulse { animation: fs-win-pulse-kf 0.5s ease-in-out 2; }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/images/symbols/fire-spike/backdrop-v20261012-unique.webp)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(12,4,2,0.22) 0%, rgba(8,2,1,0.58) 58%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      <header className="fire-spike__header">
        <span className="fire-spike__brand">MAXHIGH</span>
        <h1>Fire Spike</h1>
        <span className="fire-spike__header-rule" aria-hidden="true" />
      </header>

      <div
        data-fs-stage
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-2 py-2 sm:px-4"
      >
        <div
          data-fs-board-wrap
          className="flex w-full flex-col items-stretch"
          style={{
            width: `min(100%, calc((100dvh - 14rem) * ${cfg.reelsCount} / ${cfg.rowsCount}))`,
          }}
        >
          <div
            className="relative w-full shrink-0"
            style={{ aspectRatio: `${cfg.reelsCount} / ${cfg.rowsCount}` }}
          >
            <div
              data-fs-frame
              className="relative size-full rounded-[0.85rem] p-[5px] shadow-[0_18px_50px_rgba(234,88,12,0.55)] sm:rounded-[1.15rem] sm:p-[8px]"
              style={{
                background:
                  "linear-gradient(145deg,#fdba74 0%,#f97316 28%,#c2410c 62%,#7c2d12 100%)",
              }}
            >
              <div
                data-fs-board
                className="relative grid size-full gap-[2px] overflow-hidden rounded-[0.55rem] p-[2px] sm:gap-1 sm:rounded-[0.8rem] sm:p-1"
                style={{
                  background: "linear-gradient(180deg,#2a1008 0%,#120806 100%)",
                  gridTemplateColumns: `repeat(${cfg.reelsCount}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${cfg.rowsCount}, minmax(0, 1fr))`,
                  boxShadow: "inset 0 0 28px rgba(0,0,0,0.45)",
                }}
              >
                {Array.from({ length: cfg.rowsCount }, (_, row) =>
                  Array.from({ length: cfg.reelsCount }, (_, reel) => {
                    const kind = ui.grid[reel]?.[row] ?? "bar";
                    const key = cellKey(reel, row);
                    return (
                      <div
                        key={`${reel}-${row}`}
                        className="relative min-h-0 min-w-0 overflow-hidden"
                        style={{ gridColumn: reel + 1, gridRow: row + 1 }}
                      >
                        <ReelCell
                          kind={kind}
                          phase={ui.phase}
                          reel={reel}
                          row={row}
                          spinId={ui.spinId}
                          winning={winKeySet.has(key)}
                          mixHighlight={mixKeySet.has(key)}
                          fading={ui.fading && (winKeySet.has(key) || mixKeySet.has(key))}
                          dimmed={
                            (winKeySet.size > 0 || mixKeySet.size > 0) &&
                            !winKeySet.has(key) &&
                            !mixKeySet.has(key) &&
                            !ui.fading
                          }
                          className="!aspect-auto h-full w-full"
                        />
                      </div>
                    );
                  }),
                ).flat()}
              </div>
            </div>

            {(ui.banner || ui.popup != null) && (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center sm:top-3">
                <div
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-center text-sm font-black uppercase shadow-lg transition-opacity duration-350 ease-out",
                    ui.fading ? "opacity-0" : "opacity-100",
                    ui.jackpot
                      ? "animate-pulse border-yellow-200 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-black"
                      : "border-orange-400/70 bg-gradient-to-b from-red-800 to-[#1a0804] text-amber-100",
                  )}
                >
                  {ui.banner}
                  {ui.popup != null && (
                    <span className="ml-2 tabular-nums text-white">{formatMoney(ui.popup)}</span>
                  )}
                </div>
              </div>
            )}

            {ui.jackpot && (
              <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-[0.85rem] bg-gradient-to-b from-yellow-400/30 via-orange-500/20 to-transparent sm:rounded-[1.15rem]" />
            )}
          </div>

          <p
            data-fs-paylines
            className="mt-1.5 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-orange-200/55 sm:text-[11px]"
          >
            10 lines · mix ≥6 · grand 25,000×
            {busy ? " · spinning…" : ""}
          </p>
        </div>
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-3xl shrink-0 px-2 pb-3">
        <SlotControlDeck
          gameId="fire-spike"
          bet={bet}
          win={ui.lastWin}
          balance={balance}
          busy={busy}
          turbo={turbo}
          autoSpin={autoSpin}
          supportsSkip={false}
          spinDisabled={busy || balance < bet}
          muted={muted}
          onSpin={() => startSpin()}
          onDecreaseBet={() => nudgeBet(-1)}
          onIncreaseBet={() => nudgeBet(1)}
          onTurbo={() => setTurbo((t) => !t)}
          onAuto={() => {
            setAutoSpin((on) => {
              const next = !on;
              if (next) {
                setTimeout(() => startSpinRef.current(), 40);
              } else {
                clearAutoTimer();
              }
              return next;
            });
          }}
          onMute={() => setMuted(fireSpikeAudio.toggleMute())}
        />
      </footer>
    </div>
  );
}
