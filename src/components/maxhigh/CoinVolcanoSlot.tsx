import { CoinVolcanoView, type VolcanoUi } from "./coin-volcano/CoinVolcanoView";
/**
 * Coin Volcano slot UI — owns its own spin state machine.
 * No shared async playback from other games (CNY / Mahjong / Frontier).
 *
 * Flow: idle → api → step[0..n] (timers) → idle → (auto?) next
 * A single runId cancels stale timers. Highlights clear on every step change + on done.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { coinVolcanoSpinFn, getCoinVolcanoEngineConfigFn } from "@/functions/api";
import { useAuth } from "@/lib/auth";
import {
  COIN_VOLCANO_GAME_ID,
  type CoinVolcanoConfig,
  type McSymKind,
} from "@/lib/coin-volcano-config";
import { BET_STEPS, ANIM } from "./coin-volcano/animationConfig";
import { getCoinVolcanoConfig, setCoinVolcanoConfig } from "./coin-volcano/runtimeConfig";
import { planCoinVolcanoPlayback, type McPlaybackStep } from "./coin-volcano/spinPlayback";
import { coinVolcanoAudio } from "./coin-volcano/audio";
import { type McGrid } from "./coin-volcano/types";

function idleGrid(): McGrid {
  const cfg = getCoinVolcanoConfig();
  const kinds: McSymKind[] = ["bar", "dice", "diamond", "chip", "lucky7"];
  return Array.from({ length: cfg.reelsCount }, (_, reel) =>
    Array.from({ length: cfg.rowsCount }, (_, row) => kinds[(reel + row) % kinds.length]!),
  );
}

const INITIAL_UI = (): VolcanoUi => ({
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

const getCfgReels = () => getCoinVolcanoConfig().reelsCount;

export function CoinVolcanoSlot({
  gameId = COIN_VOLCANO_GAME_ID,
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [muted, setMuted] = useState(() => coinVolcanoAudio.isMuted);
  const [cfgSnap, setCfgSnap] = useState<CoinVolcanoConfig>(() => getCoinVolcanoConfig());
  const [ui, setUi] = useState<VolcanoUi>(INITIAL_UI);

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
    (runId: number, steps: McPlaybackStep[], index: number) => {
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
          coinVolcanoAudio.startAmbient();
          coinVolcanoAudio.startSpinLoop();
          break;
        case "stopping": {
          coinVolcanoAudio.stopSpinLoop();
          const reels = getCfgReels();
          for (let r = 0; r < reels; r++) {
            setTimeout(() => {
              if (mountedRef.current && runId === runIdRef.current)
                coinVolcanoAudio.playReelStop(r);
            }, r * 90);
          }
          break;
        }
        case "highlight_lines":
        case "highlight_mix":
        case "tally":
          coinVolcanoAudio.playWin(step.amount, betRef.current);
          break;
        case "highlight_jackpot":
          coinVolcanoAudio.playScatterTrigger();
          coinVolcanoAudio.playWin(step.amount, betRef.current);
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
        const res = await coinVolcanoSpinFn({ data: { bet: stake } });
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setBalanceLocal(res.balance);
        const cfg = getCoinVolcanoConfig();
        const steps = planCoinVolcanoPlayback(res.script, cfg.reelsCount, turboRef.current);
        runStep(runId, steps, 0);
      } catch (e) {
        if (runId !== runIdRef.current) return;
        const msg = e instanceof Error ? e.message : "Spin failed";
        toast.error(msg);
        coinVolcanoAudio.stopSpinLoop();
        setAutoSpin(false);
        applyIdle();
      }
    })();
  }, [applyIdle, runStep, setBalanceLocal]);

  startSpinRef.current = startSpin;

  useEffect(() => {
    mountedRef.current = true;
    coinVolcanoAudio.preload();
    void getCoinVolcanoEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        const next = setCoinVolcanoConfig(cfg);
        setCfgSnap(next);
        setUi((prev) => (prev.locked ? prev : { ...prev, grid: idleGrid() }));
        setBet((b) => Math.max(next.minBet, Math.min(next.maxBet, b)));
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      coinVolcanoAudio.stopSpinLoop();
      coinVolcanoAudio.stopAmbient();
      runIdRef.current += 1;
      clearTimer();
      clearAutoTimer();
    };
  }, []);

  // Watchdog: if locked longer than 12s, force unlock (API hang / bad timer)
  useEffect(() => {
    if (!ui.locked) return;
    const id = setTimeout(() => {
      console.warn("[CoinVolcano] watchdog unlock — spin exceeded 12s");
      runIdRef.current += 1;
      coinVolcanoAudio.stopSpinLoop();
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
    <CoinVolcanoView
      cfg={cfg}
      ui={ui}
      bet={bet}
      balance={balance}
      turbo={turbo}
      autoSpin={autoSpin}
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
      onMute={() => setMuted(coinVolcanoAudio.toggleMute())}
    />
  );
}
