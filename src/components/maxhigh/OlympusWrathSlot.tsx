import { OlympusAltar as SlotControlDeck } from "./olympus-wrath/OlympusAltar";
/**
 * Olympus Wrath — 4×8 cluster-pay tumble slot (panther rectangle board).
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
import { olympusWrathAudio } from "./olympus-wrath/audio";
import {
  olympusWrathBuyFeatureFn,
  olympusWrathFreeSpinFn,
  olympusWrathSpinFn,
  getOlympusWrathSessionFn,
} from "@/functions/api";
import { ANIM } from "./olympus-wrath/animationConfig";
import {
  getAutoSpinGapMs,
  getDropWaitMs,
  getPopWaitMs,
  getRefillWaitMs,
  scaleWaitMs,
} from "./olympus-wrath/playbackHelpers";
import { BetSelectModal } from "./olympus-wrath/BetSelectModal";
import { buildBuyScatterIntroBoard, initialBoard } from "./olympus-wrath/gridState";
import { BET_STEPS, getAnteMult, getBuyUnitPrice } from "./olympus-wrath/paytable";
import { setOlympusWrathConfig } from "./olympus-wrath/runtimeConfig";
import type { BoardCell, SpinScript } from "./olympus-wrath/types";
import { CELLS } from "./olympus-wrath/types";
import { WinCelebration } from "./olympus-wrath/WinCelebration";
import { FreeSpinsCongrats } from "./olympus-wrath/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./olympus-wrath/FreeSpinsTriggerModal";
import { BuyFeatureModal } from "./olympus-wrath/BuyFeatureModal";
import { PaytableModal } from "./olympus-wrath/PaytableModal";
import { AutoSpinModal, type AutoSpinOptions } from "./olympus-wrath/AutoSpinModal";
import { ReelGrid, type ReelVisuals } from "./olympus-wrath/ReelGrid";
import { olympusWrathTheme } from "./olympus-wrath/theme";
import { themeToCssVars } from "./panther-shared/theme";
import { type ReelPhase } from "./olympus-wrath/ReelCell";
import { getOlympusWrathEngineConfigFn } from "@/functions/superadmin";
import { OLYMPUS_WRATH_GAME_ID } from "@/lib/olympus-wrath-config";
import { freeSpinsProgress } from "./bonus/freeSpinsProgress";
import { BUY_BONUS_DEFAULT_QUANTITY, buyBonusTotal } from "@/lib/buy-bonus";

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
  olympusWrathAudio.preload();
  if (typeof Image === "undefined") return;
  const urls = [
    olympusWrathTheme.assets.backdrop,
    olympusWrathTheme.assets.loadingBg,
    ...Object.values(olympusWrathTheme.assets.icons),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function OlympusWrathSlot({
  gameId = "olympus-wrath",
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
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<WinPopup | null>(null);
  const [fsSummary, setFsSummary] = useState<FsSummary | null>(null);
  const [triggerModalCount, setTriggerModalCount] = useState<number | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyMode, setBuyMode] = useState<"normal" | "super">("normal");
  const [infoOpen, setInfoOpen] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [fsPaused, setFsPaused] = useState(false);
  const [muted, setMuted] = useState(() => olympusWrathAudio.isMuted);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = buyBonusTotal(
    bet,
    getBuyUnitPrice(1, BUY_BONUS_DEFAULT_QUANTITY),
    BUY_BONUS_DEFAULT_QUANTITY,
  );

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

  /** Overlay toast — never inserts into HUD (avoids layout jump). */
  const notifyCashflow = useCallback((delta: number, label: "bet" | "win" | "scatter" | "cap") => {
    const abs = formatMoney(Math.abs(delta));
    if (label === "bet") {
      toast.custom(
        () => (
          <div
            className="rounded-2xl border px-4 py-2.5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
            style={{
              borderColor: "rgba(167,139,250,0.55)",
              background: "linear-gradient(135deg, rgba(17,24,39,0.96), rgba(58,28,63,0.92))",
              color: "#d7cbfd",
            }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">Bet</div>
            <div className="text-sm font-black tabular-nums">−{abs}</div>
          </div>
        ),
        { duration: 1800 },
      );
      return;
    }
    const isWin = label === "win" || label === "scatter";
    const title = label === "scatter" ? "Scatter" : label === "cap" ? "Cap" : "Win";
    const prefix = delta < 0 ? "−" : "+";
    toast.custom(
      () => (
        <div
          className="rounded-2xl border px-4 py-2.5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
          style={{
            borderColor: isWin ? "rgba(167,139,250,0.65)" : "rgba(167,139,250,0.55)",
            background: isWin
              ? "linear-gradient(135deg, #A78BFA 0%, rgb(67,35,75) 55%, #111827 100%)"
              : "linear-gradient(135deg, rgba(17,24,39,0.96), rgba(58,28,63,0.92))",
            color: isWin ? "#f2eefe" : "#d7cbfd",
          }}
        >
          <div
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              color: isWin ? "rgba(253,242,248,0.85)" : "rgba(251,207,232,0.85)",
            }}
          >
            {title}
          </div>
          <div className="text-sm font-black tabular-nums">
            {prefix}
            {abs}
          </div>
        </div>
      ),
      { duration: 1800 },
    );
  }, []);

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
      olympusWrathAudio.startSpinLoop();
      try {
        await wait(getDropWaitMs(), gen);
      } catch {
        olympusWrathAudio.stopSpinLoop();
        return;
      }
      olympusWrathAudio.stopSpinLoop();
      olympusWrathAudio.playReelStop(5);
      olympusWrathAudio.playScatterTrigger();

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
    if (gameId === OLYMPUS_WRATH_GAME_ID || gameId === "olympus-wrath") {
      void getOlympusWrathEngineConfigFn()
        .then((cfg) => {
          if (mountedRef.current) setOlympusWrathConfig(cfg);
        })
        .catch(() => {
          /* keep defaults */
        });
      void getOlympusWrathSessionFn()
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
          console.error("[OlympusWrath] session load failed", err);
        });
    }
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      clearTrackedTimers();
      olympusWrathAudio.stopSpinLoop();
      olympusWrathAudio.stopAmbient();
    };
  }, [clearTrackedTimers, gameId]);

  /** Pull latest Superadmin math for local UI (server settle uses its own copy). */
  const refreshEngineConfig = useCallback(async () => {
    if (gameId !== OLYMPUS_WRATH_GAME_ID && gameId !== "olympus-wrath") return;
    try {
      const cfg = await getOlympusWrathEngineConfigFn();
      if (mountedRef.current) setOlympusWrathConfig(cfg);
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
        olympusWrathAudio.startSpinLoop();
        await wait(getDropWaitMs(), gen);
        olympusWrathAudio.stopSpinLoop();
        olympusWrathAudio.playReelStop(5);
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
            notifyCashflow(step.tumbleWin, "win");
          }
        }

        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
        olympusWrathAudio.playCascadeTick();
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
          notifyCashflow(leftover, leftover > 0 ? "scatter" : "cap");
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
    [wait, setBalanceLocal, notifyCashflow],
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
    olympusWrathAudio.endFreespins();
  }, []);

  const setMutedState = useCallback((on: boolean) => {
    olympusWrathAudio.setMuted(on);
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
        olympusWrathAudio.playWin(script.totalWin, totalBet);
      } else {
        setLastWin(0);
      }

      if (session.inFree && session.freeSpinsLeft > 0) {
        olympusWrathAudio.playScatterTrigger();
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
          const session = await getOlympusWrathSessionFn();
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
        olympusWrathAudio.startSpinLoop();

        if (!isFree) {
          setBalanceLocal(balance - cost);
          notifyCashflow(-cost, "bet");
        }

        await refreshEngineConfig();

        let settled: Awaited<ReturnType<typeof olympusWrathSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired — refresh and try again");
            setAutoSpin(false);
            return;
          }
          settled = await olympusWrathFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await olympusWrathSpinFn({ data: { bet, ante } });
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
            olympusWrathAudio.playScatterTrigger();
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
              notifyCashflow(settled.fsPayout.amount, "win");
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
        }
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const msg = err instanceof Error ? err.message : "Spin failed — try again";
          // Server still has open FS — restore and continue as free spins
          if (/finish free spins/i.test(msg)) {
            try {
              const session = await getOlympusWrathSessionFn();
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
          console.error("[OlympusWrath] spin failed", err);
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
      notifyCashflow,
    ],
  );

  spinRef.current = spin;

  const openBuyFeature = useCallback(
    (mode: "normal" | "super" = "normal") => {
      if (busyRef.current || phase !== "idle" || inFree) return;
      olympusWrathAudio.playUiClick();
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
        const bought = await olympusWrathBuyFeatureFn({
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
  const theme = olympusWrathTheme;
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
          {/* Board well — hug the grid (no dual-grid temple layout) */}
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
            <div
              className="relative flex max-h-full max-w-full flex-col overflow-hidden rounded-[1.25rem] p-1.5 sm:rounded-2xl sm:p-2"
              style={{
                width: "fit-content",
                height: "fit-content",
                background:
                  "linear-gradient(180deg, var(--p-well-top) 0%, var(--p-well-bottom) 100%)",
                boxShadow:
                  "inset 0 0 0 1.5px var(--p-rim), inset 0 0 40px rgba(0,0,0,0.35), 0 12px 36px rgba(0,0,0,0.45)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-16"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, var(--p-top-glow) 0%, transparent 70%)",
                }}
                aria-hidden
              />

              <div className="relative z-10 flex max-h-full max-w-full items-center justify-center">
                {showTumbleBadge && (
                  <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2">
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

                <ReelGrid visuals={reelVisuals} />
              </div>
            </div>
          </div>

          {/* Buy feature — compact on phones so the spin row stays on-screen */}

          {/* HUD — compact on Android so Spin sits above the system nav */}
          <SlotControlDeck
            gameId="olympus-wrath"
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
                olympusWrathAudio.playUiClick();
                void spin(true);
              } else {
                olympusWrathAudio.playUiClick();
                void spin(false);
              }
            }}
            onInfo={() => {
              olympusWrathAudio.playUiClick();
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
