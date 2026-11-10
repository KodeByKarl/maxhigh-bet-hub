import { SlotControlDeck } from "./SlotControlDeck";
/**
 * Panther Peak — Sweet Bonanza layout (cluster-pay tumble slot).
 * Engine resolves spins instantly; this file plays back the animation script.
 *
 * Performance notes:
 * - Playback is abortable (unmount / overlapping spin) to avoid stale setState.
 * - Timed overlays (banner / win popup) share a cleared timeout registry.
 * - Auto / free-spin loops call a stable spinRef to avoid stale closures.
 * - Reel cells are memoized; engine math stays off the animation thread.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FastForward, Info, RotateCcw, RotateCw, Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { pantherAudio } from "./golden-panther/audio";
import {
  goldenPantherBuyFeatureFn,
  goldenPantherFreeSpinFn,
  goldenPantherSpinFn,
  getGoldenPantherSessionFn,
} from "@/functions/api";
import { ANIM } from "./golden-panther/animationConfig";
import {
  getAutoSpinGapMs,
  getDropWaitMs,
  getPopWaitMs,
  getRefillWaitMs,
  scaleWaitMs,
} from "./golden-panther/playbackHelpers";
import { BetSelectModal } from "./golden-panther/BetSelectModal";
import { buildBuyScatterIntroBoard, initialBoard } from "./golden-panther/gridState";
import { BET_STEPS, getAnteMult, getBuyUnitPrice } from "./golden-panther/paytable";
import { setGoldenPantherConfig } from "./golden-panther/runtimeConfig";
import type { BoardCell, SpinScript } from "./golden-panther/types";
import { CELLS, COLS, MAIN_CELLS, ROWS, TOP_COLS } from "./golden-panther/types";
import { WinCelebration } from "./golden-panther/WinCelebration";
import { FreeSpinsCongrats } from "./golden-panther/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./golden-panther/FreeSpinsTriggerModal";
import { BuyFeatureModal } from "./golden-panther/BuyFeatureModal";
import { PaytableModal } from "./golden-panther/PaytableModal";
import { AutoSpinModal, type AutoSpinOptions } from "./golden-panther/AutoSpinModal";
import { ReelGrid, type ReelVisuals } from "./golden-panther/ReelGrid";
import { goldenPantherTheme } from "./golden-panther/theme";
import { themeToCssVars } from "./panther-shared/theme";
import { type ReelPhase } from "./golden-panther/ReelCell";
import { getGoldenPantherEngineConfigFn } from "@/functions/superadmin";
import { GOLDEN_PANTHER_GAME_ID } from "@/lib/golden-panther-config";
import { freeSpinsProgress } from "./bonus/freeSpinsProgress";
import { BUY_BONUS_FREE_SPINS } from "@/lib/buy-bonus";

type Phase = ReelPhase;
type Slot = BoardCell | null;
type WinPopup = {
  amount: number;
  baseEarn?: number | null;
  multiplier?: number | null;
};
type FsSummary = {
  amount: number;
  baseEarn: number;
  multiplier: number;
  spinsPlayed: number;
};

/** Stable empty collections — avoid allocating on every clear. */
const EMPTY_SET = new Set<string>();
const EMPTY_PAY = new Map<string, number>();
const EMPTY_FALL: Record<string, number> = Object.freeze({}) as Record<string, number>;
const TOP_INDICES = Object.freeze([0, 1, 2, 3]);
const MAIN_INDICES = Object.freeze(Array.from({ length: MAIN_CELLS }, (_, i) => i + TOP_COLS));
/** Always exactly CELLS slots — never shrink the grid. */
function asSlots(board: BoardCell[]): Slot[] {
  const slots: Slot[] = Array.from({ length: CELLS }, () => null);
  const n = Math.min(board.length, slots.length);
  for (let i = 0; i < n; i++) slots[i] = board[i];
  return slots;
}

function betIndex(bet: number) {
  const i = BET_STEPS.findIndex((v) => v >= bet);
  if (i === -1) return BET_STEPS.length - 1;
  return i;
}

/** Prefetch symbol + backdrop images once (browser cache / decode ahead of spin). */
function preloadAssets() {
  pantherAudio.preload();
  if (typeof Image === "undefined") return;
  const urls = [
    goldenPantherTheme.assets.backdrop,
    goldenPantherTheme.assets.loadingBg,
    ...Object.values(goldenPantherTheme.assets.icons),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function GoldenPantherSlot({
  gameId = "golden-panther",
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal, refreshJackpot } = useAuth();
  const balance = user?.balance ?? 0;
  const playSessionIdRef = useRef<string | null>(null);
  const [bet, setBet] = useState(5);
  const [ante, setAnte] = useState(false);
  const [slots, setSlots] = useState<Slot[]>(() => asSlots(initialBoard()));
  const [phase, setPhase] = useState<Phase>("idle");
  const [winningKeys, setWinningKeys] = useState<Set<string>>(EMPTY_SET);
  const [payoutByKey, setPayoutByKey] = useState<Map<string, number>>(EMPTY_PAY);
  const [spawnedKeys, setSpawnedKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallenKeys, setFallenKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallDistance, setFallDistance] = useState<Record<string, number>>(EMPTY_FALL);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoSpinModalOpen, setAutoSpinModalOpen] = useState(false);
  const [autoSpinConfig, setAutoSpinConfig] = useState<AutoSpinOptions | null>(null);
  const [remainingAutoSpins, setRemainingAutoSpins] = useState<number | "infinity">(0);
  const startBalance = useRef(balance);
  const [turbo, setTurbo] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [fsPlayed, setFsPlayed] = useState(0);
  /** True from the confirmed purchase until the Free Spins announcement is dismissed: the HUD counter stays hidden meanwhile. */
  const [buyPresenting, setBuyPresenting] = useState(false);
  const [inFree, setInFree] = useState(false);
  const [fsSessionWin, setFsSessionWin] = useState(0);
  const [dropTotal, setDropTotal] = useState(0);
  const [tumbleStepWin, setTumbleStepWin] = useState(0);
  const [cashflow, setCashflow] = useState<{ delta: number; label: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<WinPopup | null>(null);
  const [fsSummary, setFsSummary] = useState<FsSummary | null>(null);
  const [triggerModalCount, setTriggerModalCount] = useState<number | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyMode, setBuyMode] = useState<"normal" | "super">("normal");
  const [infoOpen, setInfoOpen] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [fsPaused, setFsPaused] = useState(false);
  const [muted, setMuted] = useState(() => pantherAudio.isMuted);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = +(getBuyUnitPrice(bet, BUY_BONUS_FREE_SPINS) * BUY_BONUS_FREE_SPINS).toFixed(2);

  const busyRef = useRef(false);
  const skipRef = useRef(false);
  const turboRef = useRef(turbo);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const freeSpinsRef = useRef(freeSpins);
  const fsSessionRef = useRef(fsSessionWin);
  const fsSpinsPlayedRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const spinRef = useRef<(asFree?: boolean) => Promise<void>>(async () => undefined);
  const triggerModalResolveRef = useRef<(() => void) | null>(null);

  turboRef.current = turbo;
  freeSpinsRef.current = freeSpins;
  fsSessionRef.current = fsSessionWin;

  const reelVisuals: ReelVisuals = {
    slots,
    phase,
    winningKeys,
    payoutByKey,
    spawnedKeys,
    fallenKeys,
    fallDistance,
  };

  const clearTrackedTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    if (!cashflow) return;
    const id = window.setTimeout(() => {
      if (mountedRef.current) setCashflow(null);
    }, 2200);
    return () => window.clearTimeout(id);
  }, [cashflow]);

  /** Abortable wait — respects turbo + skipRef + playback generation / unmount. */
  const wait = useCallback((ms: number, gen: number) => {
    if (skipRef.current) return Promise.resolve();
    const scaled = scaleWaitMs(ms, turboRef.current);
    return new Promise<void>((resolve, reject) => {
      const id = setTimeout(() => {
        timersRef.current.delete(id);
        if (!mountedRef.current || gen !== playbackGen.current) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        resolve();
      }, scaled);
      timersRef.current.add(id);
    });
  }, []);

  const dismissTriggerModal = useCallback(() => {
    setTriggerModalCount(null);
    triggerModalResolveRef.current?.();
    triggerModalResolveRef.current = null;
  }, []);

  const waitForTriggerModal = useCallback(() => {
    return new Promise<void>((resolve) => {
      triggerModalResolveRef.current = resolve;
    });
  }, []);

  /** Buy feature: drop trigger scatters, glow, then Free Spins modal before spin 1. */
  const playBuyScatterIntro = useCallback(
    async (gen: number, fsCount: number, useAnte: boolean) => {
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      setFallDistance(EMPTY_FALL);
      setDropTotal(0);
      setTumbleStepWin(0);
      setLastWin(0);
      setWinPopup(null);
      setBanner(null);

      const board = buildBuyScatterIntroBoard(useAnte);
      const scatterKeys = board.filter((c) => c.sym.scatter).map((c) => c.key);

      setPhase("dropping");
      setSlots(asSlots(board));
      pantherAudio.startSpinLoop();
      try {
        await wait(getDropWaitMs(), gen);
      } catch {
        pantherAudio.stopSpinLoop();
        return;
      }
      pantherAudio.stopSpinLoop();
      pantherAudio.playReelStop(5);
      pantherAudio.playScatterTrigger();

      setWinningKeys(new Set(scatterKeys));
      setPhase("glow");
      try {
        await wait(ANIM.buyScatterGlow, gen);
      } catch {
        setWinningKeys(EMPTY_SET);
        setPhase("idle");
        return;
      }

      setWinningKeys(EMPTY_SET);
      setPhase("idle");
      setTriggerModalCount(fsCount);
      // the announcement closes by itself so the first free spin starts automatically (a tap still skips ahead)
      const autoClose = window.setTimeout(dismissTriggerModal, turboRef.current ? 900 : 2400);
      await waitForTriggerModal();
      window.clearTimeout(autoClose);
    },
    [wait, dismissTriggerModal, waitForTriggerModal],
  );

  useEffect(() => {
    mountedRef.current = true;
    preloadAssets();
    if (gameId === GOLDEN_PANTHER_GAME_ID || gameId === "golden-panther") {
      void getGoldenPantherEngineConfigFn()
        .then((cfg) => {
          if (mountedRef.current) setGoldenPantherConfig(cfg);
        })
        .catch(() => {
          /* keep defaults */
        });
      void getGoldenPantherSessionFn()
        .then((session) => {
          if (!mountedRef.current) return;
          if (!session.sessionId || session.freeSpinsLeft <= 0) {
            playSessionIdRef.current = null;
            setInFree(false);
            setFreeSpins(0);
            freeSpinsRef.current = 0;
            return;
          }
          playSessionIdRef.current = session.sessionId;
          setInFree(true);
          setFreeSpins(session.freeSpinsLeft);
          setFsSessionWin(session.fsSessionWin);
          freeSpinsRef.current = session.freeSpinsLeft;
          fsSessionRef.current = session.fsSessionWin;
          fsSpinsPlayedRef.current = session.fsSpinsPlayed;
          setFsPlayed(session.fsSpinsPlayed);
          if (session.bet > 0) setBet(session.bet);
          setAnte(session.ante);
          setFsPaused(false);
          setFsSummary(null);
          toast.message(`Resuming ${session.freeSpinsLeft} free spins`);
        })
        .catch((err) => {
          console.error("[GoldenPanther] session load failed", err);
        });
    }
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      clearTrackedTimers();
      pantherAudio.stopSpinLoop();
      pantherAudio.stopAmbient();
    };
  }, [clearTrackedTimers, gameId]);

  /** Pull latest Superadmin math for local UI (server settle uses its own copy). */
  const refreshEngineConfig = useCallback(async () => {
    if (gameId !== GOLDEN_PANTHER_GAME_ID && gameId !== "golden-panther") return;
    try {
      const cfg = await getGoldenPantherEngineConfigFn();
      if (mountedRef.current) setGoldenPantherConfig(cfg);
    } catch {
      /* keep last known */
    }
  }, [gameId]);

  const applySession = useCallback(
    (session: {
      sessionId: string | null;
      freeSpinsLeft: number;
      fsSessionWin: number;
      fsSpinsPlayed: number;
      inFree: boolean;
    }) => {
      playSessionIdRef.current = session.sessionId;
      setInFree(session.inFree);
      setFreeSpins(session.freeSpinsLeft);
      setFsSessionWin(session.fsSessionWin);
      freeSpinsRef.current = session.freeSpinsLeft;
      fsSessionRef.current = session.fsSessionWin;
      fsSpinsPlayedRef.current = session.fsSpinsPlayed;
      setFsPlayed(session.fsSpinsPlayed);
    },
    [],
  );

  const playScript = useCallback(
    async (script: SpinScript, isFree: boolean, gen: number, startBalance: number) => {
      setDropTotal(0);
      setTumbleStepWin(0);
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      let running = 0;

      const applyRunningToHud = (nextRunning: number, stepWin = 0) => {
        running = +nextRunning.toFixed(2);
        setDropTotal(running);
        setTumbleStepWin(stepWin);
        if (isFree) {
          if (running > 0) setLastWin(+(fsSessionRef.current + running).toFixed(2));
          return;
        }
        // Paid spins only: wallet already had the bet deducted. Credit the same
        // running total the WIN meter shows so balance never drifts from tally.
        setBalanceLocal(+(startBalance + running).toFixed(2));
      };

      if (skipRef.current) {
        const lastStep = script.steps[script.steps.length - 1];
        const finalBoard = lastStep ? lastStep.afterFall : script.initialBoard;
        setSlots(asSlots(finalBoard));
        applyRunningToHud(script.totalWin, script.totalWin);
      } else {
        setPhase("dropping");
        setSlots(asSlots(script.initialBoard));
        pantherAudio.startSpinLoop();
        await wait(getDropWaitMs(), gen);
        pantherAudio.stopSpinLoop();
        pantherAudio.playReelStop(5);
      }

      for (const step of script.steps) {
        if (gen !== playbackGen.current) break;

        if (skipRef.current) {
          const lastStep = script.steps[script.steps.length - 1];
          const finalBoard = lastStep ? lastStep.afterFall : script.initialBoard;
          setSlots(asSlots(finalBoard));
          setWinningKeys(EMPTY_SET);
          setPayoutByKey(EMPTY_PAY);
          setSpawnedKeys(EMPTY_SET);
          setFallenKeys(EMPTY_SET);
          setFallDistance(EMPTY_FALL);
          applyRunningToHud(script.totalWin, script.totalWin);
          break;
        }

        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
        setSlots(asSlots(step.board));
        setWinningKeys(new Set(step.winningKeys));
        const payMap = new Map<string, number>();
        for (const c of step.clusters) {
          const badgeKey = c.keys[0];
          if (badgeKey) payMap.set(badgeKey, c.pay);
        }
        setPayoutByKey(payMap);

        // Credit BEFORE glow so WIN / badge / balance all show the amount
        // during the winning appearance — not after it ends.
        if (step.tumbleWin > 0) {
          applyRunningToHud(running + step.tumbleWin, step.tumbleWin);
          if (!isFree) {
            setCashflow({ delta: step.tumbleWin, label: "win" });
          }
        }

        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
        pantherAudio.playCascadeTick();
        await wait(getPopWaitMs(step.winningKeys.length), gen);

        setSlots(step.afterPop.length === CELLS ? step.afterPop : asSlots(step.board));
        setWinningKeys(EMPTY_SET);
        setPayoutByKey(EMPTY_PAY);
        setTumbleStepWin(0);
        await wait(ANIM.holeHold, gen);

        setFallenKeys(new Set(step.fallenKeys));
        setSpawnedKeys(new Set(step.spawnedKeys));
        setFallDistance(step.fallDistance ?? EMPTY_FALL);
        setSlots(asSlots(step.afterFall));
        setPhase("falling");
        await wait(getRefillWaitMs(), gen);
        await wait(ANIM.betweenTumbles, gen);
      }

      // Scatter / pool-cap: remaining difference vs tumble sum. Paid only —
      // FS wallet is credited once at feature end from the server.
      const leftover = +(script.totalWin - running).toFixed(2);
      if (Math.abs(leftover) >= 0.01) {
        applyRunningToHud(script.totalWin, leftover > 0 ? leftover : 0);
        if (!isFree) {
          setCashflow({
            delta: leftover,
            label: leftover > 0 ? "scatter" : "cap",
          });
        }
      } else {
        applyRunningToHud(script.totalWin, 0);
      }

      if (gen === playbackGen.current) {
        setPhase("idle");
        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
        setTumbleStepWin(0);
      }
      return script;
    },
    [wait, setBalanceLocal],
  );

  const showTotalWin = useCallback(
    (amount: number, opts?: { baseEarn?: number; multiplier?: number }) => {
      if (amount <= 0) return;
      setWinPopup({
        amount,
        baseEarn: opts?.baseEarn ?? amount,
        multiplier: opts?.multiplier ?? 1,
      });
      schedule(() => setWinPopup(null), ANIM.winPopupHold);
    },
    [schedule],
  );

  const dismissFsSummary = useCallback(() => {
    setFsSummary(null);
    fsSpinsPlayedRef.current = 0;
    setFsPlayed(0);
    pantherAudio.endFreespins();
  }, []);

  const setMutedState = useCallback((on: boolean) => {
    pantherAudio.setMuted(on);
    setMuted(on);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState(!muted);
  }, [muted, setMutedState]);

  const finishBase = useCallback(
    (
      script: SpinScript,
      session: { sessionId: string | null; freeSpinsLeft: number; inFree: boolean },
    ) => {
      if (script.totalWin > 0) {
        setLastWin(script.totalWin);
        pantherAudio.playWin(script.totalWin, totalBet);
      } else {
        setLastWin(0);
      }

      if (session.inFree && session.freeSpinsLeft > 0) {
        pantherAudio.playScatterTrigger();
        applySession({
          sessionId: session.sessionId,
          freeSpinsLeft: session.freeSpinsLeft,
          fsSessionWin: 0,
          fsSpinsPlayed: 0,
          inFree: true,
        });
        setLastWin(0);
        setBanner(`${session.freeSpinsLeft} FREE SPINS!`);
        setTriggerModalCount(session.freeSpinsLeft);
        schedule(() => setBanner(null), ANIM.bannerHold);
      } else if (script.totalWin > 0) {
        showTotalWin(script.totalWin, {
          baseEarn: script.rawWin,
          multiplier: script.displayMult,
        });
      }
    },
    [applySession, schedule, showTotalWin, totalBet],
  );

  const spin = useCallback(
    async (asFree = false) => {
      if (busyRef.current) return;

      // Prefer free-spin path whenever local OR server still has FS left.
      // (inFree state can desync after HMR / modal / skip — freeSpinsRef is source of truth.)
      let preferFree = asFree || freeSpinsRef.current > 0;

      if (!preferFree || (preferFree && !playSessionIdRef.current)) {
        try {
          const session = await getGoldenPantherSessionFn();
          if (session.sessionId && session.freeSpinsLeft > 0) {
            applySession({
              sessionId: session.sessionId,
              freeSpinsLeft: session.freeSpinsLeft,
              fsSessionWin: session.fsSessionWin,
              fsSpinsPlayed: session.fsSpinsPlayed,
              inFree: true,
            });
            preferFree = true;
          } else if (!session.sessionId || session.freeSpinsLeft <= 0) {
            playSessionIdRef.current = null;
            if (freeSpinsRef.current > 0 || inFree) {
              setInFree(false);
              setFreeSpins(0);
              freeSpinsRef.current = 0;
            }
            preferFree = false;
          }
        } catch {
          /* keep local flags */
        }
      }

      const isFree = preferFree && freeSpinsRef.current > 0 && !!playSessionIdRef.current;
      if (preferFree && !isFree) {
        toast.error("Free spin session expired — refresh and try again");
        setInFree(false);
        setFreeSpins(0);
        freeSpinsRef.current = 0;
        playSessionIdRef.current = null;
        setAutoSpin(false);
        return;
      }

      const cost = isFree ? 0 : totalBet;

      if (!isFree && balance < cost) {
        toast.error("Insufficient balance");
        setAutoSpin(false);
        return;
      }

      const gen = ++playbackGen.current;
      busyRef.current = true;
      skipRef.current = false;
      setBanner(null);
      setWinPopup(null);
      setLastWin(0);
      let recoveredToFree = false;

      try {
        pantherAudio.startSpinLoop();

        if (!isFree) {
          setBalanceLocal(balance - cost);
          setCashflow({ delta: -cost, label: "bet" });
        }

        await refreshEngineConfig();

        let settled: Awaited<ReturnType<typeof goldenPantherSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired — refresh and try again");
            setAutoSpin(false);
            return;
          }
          settled = await goldenPantherFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await goldenPantherSpinFn({ data: { bet, ante } });
          setDropTotal(0);
        }

        void refreshJackpot();
        applySession(settled.session);

        const script = await playScript(
          settled.script,
          isFree,
          gen,
          isFree ? balance : balance - cost,
        );
        if (gen !== playbackGen.current || !mountedRef.current) return;

        if (isFree) {
          setFsSessionWin(settled.session.fsSessionWin);
          setLastWin(settled.session.fsSessionWin || settled.fsPayout?.amount || 0);
          fsSessionRef.current = settled.session.fsSessionWin;
          fsSpinsPlayedRef.current = settled.session.fsSpinsPlayed;
          setFsPlayed(settled.session.fsSpinsPlayed);

          if (script.retriggerSpins > 0 && settled.session.inFree) {
            pantherAudio.playScatterTrigger();
            setBanner(`+${script.retriggerSpins} FREE SPINS!`);
            schedule(() => setBanner(null), ANIM.bannerHold);
          }

          if (settled.fsPayout) {
            setInFree(false);
            setFreeSpins(0);
            freeSpinsRef.current = 0;
            playSessionIdRef.current = null;
            setLastWin(settled.fsPayout.amount);
            setFsSummary({
              amount: settled.fsPayout.amount,
              baseEarn: settled.fsPayout.baseEarn,
              multiplier: settled.fsPayout.multiplier,
              spinsPlayed: settled.fsPayout.spinsPlayed,
            });
            setFsSessionWin(0);
            fsSessionRef.current = 0;
            if (settled.fsPayout.amount > 0) {
              setCashflow({ delta: settled.fsPayout.amount, label: "win" });
              showTotalWin(settled.fsPayout.amount, {
                baseEarn: settled.fsPayout.baseEarn,
                multiplier: settled.fsPayout.multiplier,
              });
            }
          }
        } else {
          finishBase(script, settled.session);
        }

        if (gen === playbackGen.current && mountedRef.current) {
          if (!isFree || settled.fsPayout) {
            setBalanceLocal(settled.balance);
          }
        }
      } catch (err) {
        if (!isFree) {
          setBalanceLocal(balance);
          setCashflow(null);
        }
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const msg = err instanceof Error ? err.message : "Spin failed — try again";
          // Server still has open FS — restore and continue as free spins
          if (/finish free spins/i.test(msg)) {
            try {
              const session = await getGoldenPantherSessionFn();
              if (session.sessionId && session.freeSpinsLeft > 0) {
                applySession({
                  sessionId: session.sessionId,
                  freeSpinsLeft: session.freeSpinsLeft,
                  fsSessionWin: session.fsSessionWin,
                  fsSpinsPlayed: session.fsSpinsPlayed,
                  inFree: true,
                });
                toast.message(`Resuming ${session.freeSpinsLeft} free spins`);
                recoveredToFree = true;
                busyRef.current = false;
                skipRef.current = false;
                if (mountedRef.current) setPhase("idle");
                void spin(true);
                return;
              }
            } catch {
              /* fall through */
            }
          }
          console.error("[GoldenPanther] spin failed", err);
          toast.error(msg);
          setAutoSpin(false);
        }
      } finally {
        if (!recoveredToFree && gen === playbackGen.current) {
          busyRef.current = false;
          skipRef.current = false;
          if (mountedRef.current) setPhase("idle");
        }
      }
    },
    [
      ante,
      applySession,
      balance,
      bet,
      finishBase,
      inFree,
      playScript,
      refreshEngineConfig,
      refreshJackpot,
      schedule,
      setBalanceLocal,
      showTotalWin,
      totalBet,
    ],
  );

  spinRef.current = spin;

  const openBuyFeature = useCallback(
    (mode: "normal" | "super" = "normal") => {
      if (busyRef.current || phase !== "idle" || inFree) return;
      pantherAudio.playUiClick();
      setBuyMode(mode);
      setBuyOpen(true);
    },
    [inFree, phase],
  );

  const buyFeature = useCallback(
    async (buyBet: number, quantity: number) => {
      if (busyRef.current || phase !== "idle") return;
      const unit = getBuyUnitPrice(buyBet, quantity);
      const cost = +(unit * quantity).toFixed(2);
      if (balance < cost) {
        toast.error("Insufficient balance");
        return;
      }

      setBuyOpen(false);

      setBuyPresenting(true);
      setBet(buyBet);
      try {
        const bought = await goldenPantherBuyFeatureFn({
          data: { bet: buyBet, mode: buyMode, quantity },
        });
        setBalanceLocal(bought.balance);
        void refreshJackpot();
        applySession(bought.session);
        const useAnte = buyMode === "super";
        if (useAnte) setAnte(true);
        const fsCount = bought.session.freeSpinsLeft || quantity;

        setFsSummary(null);
        setFsPaused(false);

        const gen = ++playbackGen.current;
        busyRef.current = true;
        try {
          await playBuyScatterIntro(gen, fsCount, useAnte);
        } catch {
          dismissTriggerModal();
        } finally {
          setBuyPresenting(false);
          if (gen === playbackGen.current) {
            busyRef.current = false;
            if (mountedRef.current) setPhase("idle");
          }
        }
        // First free spin starts via the auto-chain once the modal closes.
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Buy feature failed");
        setBuyPresenting(false);
      }
    },
    [
      applySession,
      balance,
      buyMode,
      dismissTriggerModal,
      phase,
      playBuyScatterIntro,
      refreshJackpot,
      setBalanceLocal,
    ],
  );

  const nudgeBet = useCallback(
    (dir: -1 | 1) => {
      if (busy) return;
      const i = betIndex(bet);
      const next = BET_STEPS[i + dir];
      if (next != null) setBet(next);
    },
    [bet, busy],
  );

  // Auto / free-spin chain — always invoke latest spin via ref (no stale closures).
  useEffect(() => {
    if (busyRef.current || busy) return;
    if (
      winPopup ||
      fsSummary ||
      buyOpen ||
      infoOpen ||
      autoSpinModalOpen ||
      betModalOpen ||
      triggerModalCount != null
    )
      return;

    const spinGap = getAutoSpinGapMs(turbo, autoSpinConfig?.spinWithoutReels);

    if (inFree && freeSpins > 0 && !fsPaused) {
      const t = setTimeout(() => {
        void spinRef.current(true);
      }, spinGap);
      return () => clearTimeout(t);
    }

    if (autoSpin && !inFree) {
      if (typeof remainingAutoSpins === "number" && remainingAutoSpins <= 0) {
        setAutoSpin(false);
        setAutoSpinConfig(null);
        return;
      }

      if (autoSpinConfig?.stopOnAnyWin && lastWin > 0) {
        setAutoSpin(false);
        setAutoSpinConfig(null);
        toast.info("Auto Spin stopped: Win achieved");
        return;
      }

      if (autoSpinConfig?.singleWinExceeds && lastWin >= autoSpinConfig.singleWinExceeds) {
        setAutoSpin(false);
        setAutoSpinConfig(null);
        toast.info(`Auto Spin stopped: Win exceeds ₱${autoSpinConfig.singleWinExceeds.toFixed(2)}`);
        return;
      }

      if (
        autoSpinConfig?.balanceIncreaseBy &&
        balance - startBalance.current >= autoSpinConfig.balanceIncreaseBy
      ) {
        setAutoSpin(false);
        setAutoSpinConfig(null);
        toast.info(
          `Auto Spin stopped: Balance increased by ₱${autoSpinConfig.balanceIncreaseBy.toFixed(2)}`,
        );
        return;
      }

      if (
        autoSpinConfig?.balanceDecreaseBy &&
        startBalance.current - balance >= autoSpinConfig.balanceDecreaseBy
      ) {
        setAutoSpin(false);
        setAutoSpinConfig(null);
        toast.info(
          `Auto Spin stopped: Balance decreased by ₱${autoSpinConfig.balanceDecreaseBy.toFixed(2)}`,
        );
        return;
      }

      if (typeof remainingAutoSpins === "number") {
        setRemainingAutoSpins((prev) => (typeof prev === "number" ? prev - 1 : prev));
      }

      const t = setTimeout(() => {
        void spinRef.current(false);
      }, spinGap);
      return () => clearTimeout(t);
    }
  }, [
    autoSpin,
    autoSpinConfig,
    autoSpinModalOpen,
    balance,
    busy,
    fsSummary,
    buyOpen,
    infoOpen,
    winPopup,
    inFree,
    freeSpins,
    lastWin,
    triggerModalCount,
    buyPresenting,
    fsPaused,
    turbo,
  ]);

  const displayWin = dropTotal > 0 ? dropTotal : inFree ? fsSessionWin : lastWin;
  const showTumbleBadge = tumbleStepWin > 0 && (phase === "glow" || phase === "popping");
  const theme = goldenPantherTheme;
  const themeVars = themeToCssVars(theme);

  return (
    <div
      className="relative flex h-full min-h-0 w-full max-w-[100vw] flex-col overflow-hidden select-none"
      style={themeVars}
    >
      <img
        src={theme.assets.backdrop}
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />

      <button
        type="button"
        onClick={toggleMute}
        className="absolute right-2 top-[max(0.4rem,env(safe-area-inset-top))] z-30 grid size-9 place-items-center rounded-full border bg-black/55 backdrop-blur-sm hover:brightness-125"
        style={{
          borderColor: "var(--p-mute-border)",
          color: "var(--p-mute-text)",
        }}
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Playfield — sit above Android 3-button nav (safe-area is often 0 there) */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-1.5 pt-[max(0.25rem,env(safe-area-inset-top))] pb-[max(3.25rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:px-3 sm:py-2 sm:pb-2">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[840px] flex-col">
          {/* Open temple well — thin gold rim, no heavy metal box */}
          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            <div
              className="relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.25rem] sm:rounded-2xl"
              style={{
                maxWidth: "min(100%, 800px)",
                background:
                  "linear-gradient(180deg, var(--p-well-top) 0%, var(--p-well-bottom) 100%)",
                boxShadow:
                  "inset 0 0 0 1.5px var(--p-rim), inset 0 0 40px rgba(0,0,0,0.35), 0 12px 36px rgba(0,0,0,0.45)",
              }}
            >
              {/* Soft top glow */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, var(--p-top-glow) 0%, transparent 70%)",
                }}
                aria-hidden
              />

              {/* TOP TRACKER — same well, no nested frame */}
              <div className="relative z-20 flex w-full shrink-0 justify-center pt-1">
                <div
                  className="grid w-[66.666%] overflow-visible"
                  style={{
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    aspectRatio: "4 / 1",
                  }}
                >
                  <ReelGrid
                    indices={TOP_INDICES}
                    cols={4}
                    visuals={reelVisuals}
                    isTop
                    keyPrefix="top-slot"
                  />
                </div>
              </div>

              {/* Thin gold divider under top reel */}
              <div
                className="relative z-10 mx-auto my-0.5 h-px w-[92%] shrink-0 opacity-80"
                style={{
                  background: "linear-gradient(90deg, transparent, var(--p-divider), transparent)",
                }}
                aria-hidden
              />

              {/* MAIN 6×7 — open grid, no cell boxes */}
              <div className="relative z-10 min-h-0 w-full flex-1 px-0.5 pb-1">
                {showTumbleBadge && (
                  <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className="rounded-full border-2 px-4 py-1.5 text-center shadow-[0_0_20px_var(--p-spin-shadow)]"
                      style={{
                        borderColor: "var(--p-tumble-border)",
                        background:
                          "linear-gradient(180deg, var(--p-tumble-from) 0%, var(--p-tumble-to) 100%)",
                      }}
                    >
                      <div
                        className="text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{ color: "var(--p-accent-soft)" }}
                      >
                        Tumble Win
                      </div>
                      <div
                        className="text-lg font-black leading-none tabular-nums sm:text-xl"
                        style={{ color: "var(--p-tumble-text)" }}
                      >
                        {formatMoney(tumbleStepWin, { signed: true })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtle column guides only */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bottom-1 z-[1] grid opacity-[0.12]"
                  style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                  aria-hidden
                >
                  {Array.from({ length: COLS }).map((_, c) => (
                    <div
                      key={c}
                      className="border-r last:border-r-0"
                      style={{ borderColor: "var(--p-accent-soft)" }}
                    />
                  ))}
                </div>

                <div
                  className="relative z-[2] grid size-full overflow-visible"
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                  }}
                >
                  <ReelGrid
                    indices={MAIN_INDICES}
                    cols={COLS}
                    visuals={reelVisuals}
                    indexOffset={TOP_COLS}
                    keyPrefix="slot"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buy feature — compact on phones so the spin row stays on-screen */}

          {/* HUD — compact on Android so Spin sits above the system nav */}
          <SlotControlDeck
            gameId="golden-panther"
            bet={totalBet}
            win={displayWin}
            balance={balance}
            busy={busy}
            turbo={turbo}
            autoSpin={autoSpin}
            inFree={inFree && triggerModalCount == null && !buyPresenting}
            freeSpins={freeSpins}
            freeSpinsProgress={
              inFree && triggerModalCount == null && !buyPresenting
                ? freeSpinsProgress(fsPlayed, freeSpins, busy)
                : null
            }
            freeSpinsPaused={fsPaused}
            autoRemaining={remainingAutoSpins}
            spinDisabled={!busy && !autoSpin && inFree && freeSpins === 0}
            onSpin={() => {
              if (busy) {
                skipRef.current = true;
                if (inFree || freeSpins > 0) setFsPaused(true);
              } else if (autoSpin) {
                setAutoSpin(false);
                setAutoSpinConfig(null);
              } else if (inFree || freeSpins > 0) {
                setFsPaused(false);
                pantherAudio.playUiClick();
                void spin(true);
              } else {
                pantherAudio.playUiClick();
                void spin(false);
              }
            }}
            onInfo={() => {
              pantherAudio.playUiClick();
              setInfoOpen(true);
            }}
            onDecreaseBet={() => nudgeBet(-1)}
            onIncreaseBet={() => nudgeBet(1)}
            onSelectBet={() => setBetModalOpen(true)}
            onTurbo={() => setTurbo((v) => !v)}
            onAuto={() => {
              if (busy || autoSpin || inFree) {
                setAutoSpin(false);
                setAutoSpinConfig(null);
                skipRef.current = true;
                if (inFree) setFsPaused(true);
              } else {
                setAutoSpinModalOpen(true);
              }
            }}
            buyFeature={
              !inFree
                ? { price: buyCost, disabled: busy, onClick: () => openBuyFeature("normal") }
                : undefined
            }
          />
        </div>
      </div>

      <AnimatePresence>
        {autoSpinModalOpen && (
          <AutoSpinModal
            bet={totalBet}
            onClose={() => setAutoSpinModalOpen(false)}
            onStart={(options) => {
              setAutoSpinConfig(options);
              setRemainingAutoSpins(options.spinCount);
              startBalance.current = balance;
              if (options.spinWithoutReels) {
                setTurbo(true);
              }
              setAutoSpinModalOpen(false);
              setAutoSpin(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {infoOpen && <PaytableModal bet={totalBet} onClose={() => setInfoOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {betModalOpen && (
          <BetSelectModal
            currentBet={bet}
            onSelectBet={(newBet) => setBet(newBet)}
            onClose={() => setBetModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buyOpen && (
          <BuyFeatureModal
            balance={balance}
            bet={bet}
            mode={buyMode}
            onCancel={() => setBuyOpen(false)}
            onConfirm={(buyBet, quantity) => {
              void buyFeature(buyBet, quantity);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fsSummary && (
          <FreeSpinsCongrats
            amount={fsSummary.amount}
            baseEarn={fsSummary.baseEarn}
            multiplier={fsSummary.multiplier}
            spinsPlayed={fsSummary.spinsPlayed}
            onContinue={dismissFsSummary}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winPopup && !fsSummary && (
          <WinCelebration
            amount={winPopup.amount}
            bet={bet}
            baseEarn={winPopup.baseEarn}
            multiplier={winPopup.multiplier}
            onDismiss={() => setWinPopup(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {triggerModalCount != null && (
          <FreeSpinsTriggerModal count={triggerModalCount} onClose={dismissTriggerModal} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {banner && !winPopup && !fsSummary && !triggerModalCount && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
            <div
              className="rounded-2xl border-4 border-white px-10 py-5 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(180deg, var(--p-spin-from) 0%, var(--p-spin-mid) 100%)",
              }}
            >
              <h2 className="mb-2 font-black uppercase tracking-widest text-white drop-shadow-md sm:text-lg">
                {banner}
              </h2>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
