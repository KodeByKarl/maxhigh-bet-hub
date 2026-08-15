/**
 * Prosperity Lion slot UI — owns its own spin state machine.
 * Frontend is non-authoritative: animates resolved SpinScript from the server.
 *
 * Flow: idle → api → step[0..n] (timers) → idle → (auto?) next
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { prosperityLionSpinFn, getProsperityLionEngineConfigFn } from "@/functions/api";
import { useAuth } from "@/lib/auth";
import {
  PROSPERITY_LION_GAME_ID,
  spinStake,
  type ProsperityLionConfig,
  type FtSymKind,
} from "@/lib/prosperity-lion-config";
import { cn } from "@/lib/utils";
import { BET_STEPS, ANIM, BG_SRC } from "./prosperity-lion/animationConfig";
import { MultiplierReelView } from "./prosperity-lion/MultiplierReelView";
import { PaytableModal } from "./prosperity-lion/PaytableModal";
import { ReelCell, type ReelPhase } from "./prosperity-lion/ReelCell";
import { getProsperityLionConfig, setProsperityLionConfig } from "./prosperity-lion/runtimeConfig";
import { planProsperityLionPlayback, type FtPlaybackStep } from "./prosperity-lion/spinPlayback";
import { cellKey, type FtGrid, type MultiplierReelResult } from "./prosperity-lion/types";

function idleGrid(): FtGrid {
  const cfg = getProsperityLionConfig();
  const kinds: FtSymKind[] = ["ruby", "emerald", "sapphire", "amethyst", "topaz", "temple"];
  return Array.from({ length: cfg.reelsCount }, (_, reel) =>
    Array.from({ length: cfg.rowsCount }, (_, row) => kinds[(reel + row) % kinds.length]!),
  );
}

function idleMult(): MultiplierReelResult {
  return { faces: [2, 1, 3], center: 1 };
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type UiSnap = {
  phase: ReelPhase;
  grid: FtGrid;
  multiplierReel: MultiplierReelResult;
  winKeys: string[];
  multHighlight: boolean;
  banner: string | null;
  popup: number | null;
  fading: boolean;
  lastWin: number;
  spinId: number;
  locked: boolean;
};

const INITIAL_UI = (): UiSnap => ({
  phase: "idle",
  grid: idleGrid(),
  multiplierReel: idleMult(),
  winKeys: [],
  multHighlight: false,
  banner: null,
  popup: null,
  fading: false,
  lastWin: 0,
  spinId: 0,
  locked: false,
});

export function ProsperityLionSlot({
  gameId = PROSPERITY_LION_GAME_ID,
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [exMode, setExMode] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [cfgSnap, setCfgSnap] = useState<ProsperityLionConfig>(() => getProsperityLionConfig());
  const [ui, setUi] = useState<UiSnap>(INITIAL_UI);

  const runIdRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const autoRef = useRef(autoSpin);
  const turboRef = useRef(turbo);
  const betRef = useRef(bet);
  const exRef = useRef(exMode);
  const startSpinRef = useRef<() => void>(() => undefined);

  autoRef.current = autoSpin;
  turboRef.current = turbo;
  betRef.current = bet;
  exRef.current = exMode;

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
      multHighlight: false,
      banner: null,
      popup: null,
      fading: false,
      locked: false,
      lastWin: lastWin !== undefined ? lastWin : prev.lastWin,
    }));
  }, []);

  const scheduleContinue = useCallback((reason: "auto" | "win") => {
    clearAutoTimer();
    if (!mountedRef.current) return;
    if (reason === "auto" && !autoRef.current) return;
    autoTimerRef.current = setTimeout(() => {
      autoTimerRef.current = null;
      if (!mountedRef.current || lockedRef.current) return;
      if (reason === "auto" && !autoRef.current) return;
      startSpinRef.current();
    }, turboRef.current ? 150 : 500);
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
        multHighlight: false,
        banner: null,
        popup: null,
        fading: false,
      }));
      then();
    }, fadeMs);
  }, []);

  const runStep = useCallback(
    (runId: number, steps: FtPlaybackStep[], index: number) => {
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
          multHighlight: false,
          banner: null,
          popup: null,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "stopping") {
        setUi((prev) => ({
          ...prev,
          phase: "stopping",
          grid: step.grid,
          multiplierReel: step.multiplierReel,
          winKeys: [],
          multHighlight: false,
          banner: null,
          popup: null,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "highlight_lines") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: step.keys,
          multHighlight: false,
          banner: step.label,
          popup: step.amount,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "highlight_mult") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          multHighlight: true,
          banner: step.label,
          popup: step.amount,
          fading: false,
          locked: true,
        }));
      } else if (step.type === "tally") {
        setUi((prev) => ({
          ...prev,
          phase: "win",
          winKeys: [],
          multHighlight: true,
          banner: step.label,
          popup: step.amount,
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

      const ms = "ms" in step ? step.ms : 0;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (runId !== runIdRef.current) return;
        const isCelebrate =
          step.type === "highlight_lines" ||
          step.type === "highlight_mult" ||
          step.type === "tally";
        if (isCelebrate) {
          fadeOutWin(runId, () => runStep(runId, steps, index + 1));
          return;
        }
        runStep(runId, steps, index + 1);
      }, Math.max(16, ms));
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
    const ex = exRef.current;

    setUi((prev) => ({
      ...prev,
      locked: true,
      phase: "spinning",
      winKeys: [],
      multHighlight: false,
      banner: null,
      popup: null,
      fading: false,
      spinId: prev.spinId + 1,
    }));

    void (async () => {
      try {
        const res = await prosperityLionSpinFn({ data: { bet: stake, exMode: ex } });
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setBalanceLocal(res.balance);
        const steps = planProsperityLionPlayback(res.script, turboRef.current);
        runStep(runId, steps, 0);
      } catch (e) {
        if (runId !== runIdRef.current) return;
        const msg = e instanceof Error ? e.message : "Spin failed";
        toast.error(msg);
        setAutoSpin(false);
        applyIdle();
      }
    })();
  }, [applyIdle, runStep, setBalanceLocal]);

  startSpinRef.current = startSpin;

  useEffect(() => {
    mountedRef.current = true;
    void getProsperityLionEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        const next = setProsperityLionConfig(cfg);
        setCfgSnap(next);
        setUi((prev) => (prev.locked ? prev : { ...prev, grid: idleGrid() }));
        setBet((b) => Math.max(next.minBet, Math.min(next.maxBet, b)));
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      clearTimer();
      clearAutoTimer();
    };
  }, []);

  useEffect(() => {
    if (!ui.locked) return;
    const id = setTimeout(() => {
      console.warn("[ProsperityLion] watchdog unlock — spin exceeded 12s");
      runIdRef.current += 1;
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
  const cost = spinStake(bet, exMode, cfg);

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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0c0814] text-white">
      <style>{`
        @keyframes fg-reel-scroll-kf {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes fg-reel-land-kf {
          from { transform: translateY(-120%); opacity: 0.35; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fg-win-pulse-kf {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.06); filter: brightness(1.2); }
        }
        .fg-reel-scroll { animation: fg-reel-scroll-kf 0.22s linear infinite; }
        .fg-reel-land { animation: fg-reel-land-kf 0.35s ease-out both; }
        .fg-win-pulse { animation: fg-win-pulse-kf 0.5s ease-in-out 2; }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${BG_SRC}), radial-gradient(ellipse at 50% 30%, #4a1d0a 0%, #120818 55%, #050308 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(12,6,18,0.25) 0%, rgba(8,4,14,0.62) 58%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      <header className="relative z-10 flex shrink-0 flex-col items-center gap-2.5 px-3 pt-3 sm:pt-4">
        <div className="relative w-full max-w-md rounded-2xl border border-amber-500/50 bg-gradient-to-b from-[#3a1a08]/90 to-[#120810]/95 px-5 py-2 text-center shadow-[0_0_28px_rgba(245,158,11,0.25)]">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-amber-500/50 bg-black/35 text-amber-100 hover:bg-amber-900/40"
            title="Paytable & rules"
            aria-label="Info"
          >
            <Info className="size-4" />
          </button>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/90">
            MaxHigh · Prosperity Lion
          </p>
          <h1 className="bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-400 bg-clip-text text-xl font-black uppercase tracking-wide text-transparent sm:text-2xl">
            Prosperity Lion
          </h1>
        </div>

        <div className="flex w-full max-w-md items-center justify-center gap-3">
          <div className="min-w-[8.5rem] flex-1 rounded-xl border border-amber-500/40 bg-[#1a0e14]/90 px-4 py-1.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/80">
              Balance
            </p>
            <p className="font-black tabular-nums text-amber-100">{formatMoney(balance)}</p>
          </div>
          <div className="min-w-[8.5rem] flex-1 rounded-xl border border-amber-500/40 bg-[#1a0e14]/90 px-4 py-1.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/80">
              Last win
            </p>
            <p className="font-black tabular-nums text-amber-100">{formatMoney(ui.lastWin)}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[900px] flex-1 flex-col items-center justify-center px-2 py-2 sm:px-4">
        <div className="flex h-full min-h-0 max-h-full w-full items-stretch gap-2 sm:gap-3">
          {/* Main 3×3 grid */}
          <div className="relative min-h-0 min-w-0 flex-[3]">
            <div
              className="relative mx-auto size-full max-h-full"
              style={{ aspectRatio: "3 / 3", maxHeight: "100%" }}
            >
              <div
                className="relative grid size-full gap-1 overflow-hidden rounded-[0.85rem] border-[3px] border-amber-500/70 p-1.5 shadow-[0_18px_50px_rgba(180,83,9,0.45)] sm:gap-1.5 sm:rounded-[1.15rem] sm:p-2"
                style={{
                  background:
                    "linear-gradient(145deg,#fbbf24 0%,#b45309 40%,#7c2d12 100%)",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gridTemplateRows: "repeat(3, minmax(0, 1fr))",
                }}
              >
                {Array.from({ length: cfg.rowsCount }, (_, row) =>
                  Array.from({ length: cfg.reelsCount }, (_, reel) => {
                    const kind = ui.grid[reel]?.[row] ?? "temple";
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
                          fading={ui.fading && winKeySet.has(key)}
                          dimmed={
                            winKeySet.size > 0 &&
                            !winKeySet.has(key) &&
                            !ui.fading
                          }
                          className="!aspect-auto h-full w-full"
                        />
                      </div>
                    );
                  }),
                ).flat()}
              </div>

              {(ui.banner || ui.popup != null) && (
                <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center sm:top-3">
                  <div
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-center text-sm font-black uppercase shadow-lg transition-opacity duration-350 ease-out",
                      ui.fading ? "opacity-0" : "opacity-100",
                      "border-amber-400/70 bg-gradient-to-b from-rose-900 to-[#1a0804] text-amber-100",
                    )}
                  >
                    {ui.banner}
                    {ui.popup != null && (
                      <span className="ml-2 tabular-nums text-white">{formatMoney(ui.popup)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4th multiplier reel */}
          <div className="relative min-h-0 w-[22%] max-w-[7.5rem] shrink-0 sm:w-[20%]">
            <MultiplierReelView
              faces={ui.multiplierReel.faces}
              spinning={ui.phase === "spinning"}
              highlight={ui.multHighlight}
              fading={ui.fading}
              spinId={ui.spinId}
              className="h-full"
            />
          </div>
        </div>

        <p className="mt-1.5 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-200/55 sm:text-[11px]">
          5 lines · mult reel · {exMode ? "EX ON (+50%)" : "base"}
          {busy ? " · spinning…" : ""}
        </p>
      </div>

      <footer className="relative z-10 shrink-0 px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
        <div className="mx-auto w-full max-w-lg rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-[#2a1408]/95 to-[#0c0610]/98 px-3 py-3 shadow-[0_0_30px_rgba(245,158,11,0.2)] sm:px-4">
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => nudgeBet(-1)}
                className="grid size-10 place-items-center rounded-xl border border-amber-500/50 bg-[#2a1408] text-lg font-black text-amber-100 disabled:opacity-40"
              >
                −
              </button>

              <div className="min-w-[6.5rem] rounded-xl border border-amber-500/45 bg-gradient-to-b from-[#3a1608] to-[#0c0402] px-3 py-1.5 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/75">
                  Bet{exMode ? " → cost" : ""}
                </p>
                <p className="text-base font-black tabular-nums text-amber-100">
                  {exMode ? (
                    <>
                      <span className="text-amber-200/60 line-through decoration-amber-500/50">
                        {formatMoney(bet)}
                      </span>{" "}
                      {formatMoney(cost)}
                    </>
                  ) : (
                    formatMoney(bet)
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => nudgeBet(1)}
                className="grid size-10 place-items-center rounded-xl border border-amber-500/50 bg-[#2a1408] text-lg font-black text-amber-100 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setExMode((v) => !v)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-wider",
                  exMode
                    ? "border-rose-300 bg-gradient-to-b from-rose-500 to-amber-600 text-black shadow-[0_0_18px_rgba(244,63,94,0.45)]"
                    : "border-amber-600/55 bg-[#1a0a06] text-amber-200/85",
                )}
                title="Extra Bet +50% — improves multiplier-reel odds"
              >
                EX {exMode ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() => setTurbo((t) => !t)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-wider",
                  turbo
                    ? "border-amber-300 bg-gradient-to-b from-amber-400 to-rose-600 text-black"
                    : "border-amber-600/55 bg-[#1a0a06] text-amber-200/85",
                )}
              >
                Turbo
              </button>

              <button
                type="button"
                disabled={busy || balance < cost}
                onClick={() => startSpin()}
                className="min-w-[8.5rem] rounded-full border-2 border-amber-300/80 bg-gradient-to-b from-amber-400 via-rose-600 to-rose-950 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-amber-50 shadow-[0_0_28px_rgba(245,158,11,0.55)] disabled:opacity-40"
              >
                {busy ? "…" : "Spin"}
              </button>

              <button
                type="button"
                onClick={() => {
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
                className={cn(
                  "rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-wider",
                  autoSpin
                    ? "border-yellow-300 bg-gradient-to-b from-amber-400 to-orange-600 text-black"
                    : "border-amber-600/55 bg-[#1a0a06] text-amber-200/85",
                )}
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      </footer>

      <PaytableModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
