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
import { jadeJaguarAudio } from "./jade-jaguar/audio";
import {
  jadeJaguarBuyFeatureFn,
  jadeJaguarFreeSpinFn,
  jadeJaguarSpinFn,
  getJadeJaguarSessionFn,
} from "@/functions/api";
import { ANIM } from "./jade-jaguar/animationConfig";
import {
  getAutoSpinGapMs,
  getDropWaitMs,
  getPopWaitMs,
  getRefillWaitMs,
  scaleWaitMs,
} from "./jade-jaguar/playbackHelpers";
import { BetSelectModal } from "./jade-jaguar/BetSelectModal";
import { buildBuyScatterIntroBoard, initialBoard } from "./jade-jaguar/gridState";
import {
  BET_STEPS,
  BUY_FS_START_BET,
  getAnteMult,
  getBuyUnitPrice,
} from "./jade-jaguar/paytable";
import { setJadeJaguarConfig } from "./jade-jaguar/runtimeConfig";
import type { BoardCell, SpinScript } from "./jade-jaguar/types";
import { CELLS } from "./jade-jaguar/types";
import { WinCelebration } from "./jade-jaguar/WinCelebration";
import { FreeSpinsCongrats } from "./jade-jaguar/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./jade-jaguar/FreeSpinsTriggerModal";
import { BuyFeatureModal } from "./jade-jaguar/BuyFeatureModal";
import { PaytableModal } from "./jade-jaguar/PaytableModal";
import { AutoSpinModal, type AutoSpinOptions } from "./jade-jaguar/AutoSpinModal";
import { ReelGrid, type ReelVisuals } from "./jade-jaguar/ReelGrid";
import { jadeJaguarTheme } from "./jade-jaguar/theme";
import { themeToCssVars } from "./panther-shared/theme";
import { type ReelPhase } from "./jade-jaguar/ReelCell";
import { getJadeJaguarEngineConfigFn } from "@/functions/superadmin";
import { JADE_JAGUAR_GAME_ID } from "@/lib/jade-jaguar-config";

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
  jadeJaguarAudio.preload();
  if (typeof Image === "undefined") return;
  const urls = [
    jadeJaguarTheme.assets.backdrop,
    jadeJaguarTheme.assets.loadingBg,
    ...Object.values(jadeJaguarTheme.assets.icons),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function JadeJaguarSlot({
  gameId = "jade-jaguar",
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
  const [muted, setMuted] = useState(() => jadeJaguarAudio.isMuted);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = getBuyUnitPrice(BUY_FS_START_BET, "normal");
  const superBuyCost = getBuyUnitPrice(BUY_FS_START_BET, "super");

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
  const notifyCashflow = useCallback(
    (delta: number, label: "bet" | "win" | "scatter" | "cap") => {
      const abs = formatMoney(Math.abs(delta));
      if (label === "bet") {
        toast.custom(
          () => (
            <div
              className="rounded-2xl border px-4 py-2.5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
              style={{
                borderColor: "rgba(110,231,183,0.55)",
                background:
                  "linear-gradient(135deg, rgba(2,12,10,0.96), rgba(6,78,59,0.96))",
                color: "#A7F3D0",
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
                Bet
              </div>
              <div className="text-sm font-black tabular-nums">−{abs}</div>
            </div>
          ),
          { duration: 1800 },
        );
        return;
      }
      const isWin = label === "win" || label === "scatter";
      const title =
        label === "scatter" ? "Scatter" : label === "cap" ? "Cap" : "Win";
      const prefix = delta < 0 ? "−" : "+";
      toast.custom(
        () => (
          <div
            className="rounded-2xl border px-4 py-2.5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
            style={{
              borderColor: isWin
                ? "rgba(110,231,183,0.65)"
                : "rgba(52,211,153,0.55)",
              background: isWin
                ? "linear-gradient(135deg, #059669 0%, #064E3B 55%, #02100C 100%)"
                : "linear-gradient(135deg, rgba(2,12,10,0.96), rgba(6,78,59,0.96))",
              color: isWin ? "#ECFDF5" : "#A7F3D0",
            }}
          >
            <div
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{
                color: isWin ? "rgba(209,250,229,0.85)" : "rgba(167,243,208,0.85)",
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
    },
    [],
  );

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
      jadeJaguarAudio.startSpinLoop();
      try {
        await wait(getDropWaitMs(), gen);
      } catch {
        jadeJaguarAudio.stopSpinLoop();
        return;
      }
      jadeJaguarAudio.stopSpinLoop();
      jadeJaguarAudio.playReelStop(5);
      jadeJaguarAudio.playScatterTrigger();

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
      await waitForTriggerModal();
    },
    [wait, waitForTriggerModal],
  );

  useEffect(() => {
    mountedRef.current = true;
    preloadAssets();
    if (gameId === JADE_JAGUAR_GAME_ID || gameId === "jade-jaguar") {
      void getJadeJaguarEngineConfigFn()
        .then((cfg) => {
          if (mountedRef.current) setJadeJaguarConfig(cfg);
        })
        .catch(() => {
          /* keep defaults */
        });
      void getJadeJaguarSessionFn()
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
          if (session.bet > 0) setBet(session.bet);
          setAnte(session.ante);
          setFsPaused(false);
          setFsSummary(null);
          toast.message(`Resuming ${session.freeSpinsLeft} free spins`);
        })
        .catch((err) => {
          console.error("[JadeJaguar] session load failed", err);
        });
    }
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      clearTrackedTimers();
      jadeJaguarAudio.stopSpinLoop();
      jadeJaguarAudio.stopAmbient();
    };
  }, [clearTrackedTimers, gameId]);

  /** Pull latest Superadmin math for local UI (server settle uses its own copy). */
  const refreshEngineConfig = useCallback(async () => {
    if (gameId !== JADE_JAGUAR_GAME_ID && gameId !== "jade-jaguar") return;
    try {
      const cfg = await getJadeJaguarEngineConfigFn();
      if (mountedRef.current) setJadeJaguarConfig(cfg);
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
        jadeJaguarAudio.startSpinLoop();
        await wait(getDropWaitMs(), gen);
        jadeJaguarAudio.stopSpinLoop();
        jadeJaguarAudio.playReelStop(5);
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
        jadeJaguarAudio.playCascadeTick();
        await wait(getPopWaitMs(step.winningKeys.length), gen);

        setSlots(
          step.afterPop.length === CELLS ? step.afterPop : asSlots(step.board),
        );
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
    jadeJaguarAudio.endFreespins();
  }, []);

  const setMutedState = useCallback((on: boolean) => {
    jadeJaguarAudio.setMuted(on);
    setMuted(on);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState(!muted);
  }, [muted, setMutedState]);

  const finishBase = useCallback(
    (script: SpinScript, session: { sessionId: string | null; freeSpinsLeft: number; inFree: boolean }) => {
      if (script.totalWin > 0) {
        setLastWin(script.totalWin);
        jadeJaguarAudio.playWin(script.totalWin, totalBet);
      } else {
        setLastWin(0);
      }

      if (session.inFree && session.freeSpinsLeft > 0) {
        jadeJaguarAudio.playScatterTrigger();
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
          const session = await getJadeJaguarSessionFn();
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
        if (!isFree) {
          setBalanceLocal(balance - cost);
          notifyCashflow(-cost, "bet");
        }

        await refreshEngineConfig();

        let settled: Awaited<ReturnType<typeof jadeJaguarSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired — refresh and try again");
            setAutoSpin(false);
            return;
          }
          settled = await jadeJaguarFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await jadeJaguarSpinFn({ data: { bet, ante } });
          setDropTotal(0);
        }

        void refreshJackpot();
        applySession(settled.session);

        const script = await playScript(settled.script, isFree, gen, isFree ? balance : balance - cost);
        if (gen !== playbackGen.current || !mountedRef.current) return;

        if (isFree) {
          setFsSessionWin(settled.session.fsSessionWin);
          setLastWin(settled.session.fsSessionWin || settled.fsPayout?.amount || 0);
          fsSessionRef.current = settled.session.fsSessionWin;
          fsSpinsPlayedRef.current = settled.session.fsSpinsPlayed;

          if (script.retriggerSpins > 0 && settled.session.inFree) {
            jadeJaguarAudio.playScatterTrigger();
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
              const session = await getJadeJaguarSessionFn();
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
          console.error("[JadeJaguar] spin failed", err);
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
      notifyCashflow,
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
      jadeJaguarAudio.playUiClick();
      setBuyMode(mode);
      setBuyOpen(true);
    },
    [inFree, phase],
  );

  const buyFeature = useCallback(
    async (buyBet: number, quantity: number) => {
      if (busyRef.current || phase !== "idle") return;
      const unit = getBuyUnitPrice(buyBet, buyMode);
      const cost = +(unit * quantity).toFixed(2);
      if (balance < cost) {
        toast.error("Insufficient balance");
        return;
      }

      setBuyOpen(false);
      setBet(buyBet);
      try {
        const bought = await jadeJaguarBuyFeatureFn({
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
          if (gen === playbackGen.current) {
            busyRef.current = false;
            if (mountedRef.current) setPhase("idle");
          }
        }
        // First free spin starts via the auto-chain once the modal closes.
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Buy feature failed");
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
    if (winPopup || fsSummary || buyOpen || infoOpen || autoSpinModalOpen || betModalOpen || triggerModalCount != null) return;

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
          `Auto Spin stopped: Balance increased by ₱${autoSpinConfig.balanceIncreaseBy.toFixed(2)}`
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
          `Auto Spin stopped: Balance decreased by ₱${autoSpinConfig.balanceDecreaseBy.toFixed(2)}`
        );
        return;
      }

      if (typeof remainingAutoSpins === "number") {
        setRemainingAutoSpins((prev) => (typeof prev === "number" ? prev - 1 : prev));
      }

      const t = setTimeout(
        () => {
          void spinRef.current(false);
        },
        spinGap,
      );
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
    fsPaused,
    turbo,
  ]);

  const displayWin = dropTotal > 0 ? dropTotal : (inFree ? fsSessionWin : lastWin);
  const showTumbleBadge =
    tumbleStepWin > 0 &&
    (phase === "glow" || phase === "popping");
  const theme = jadeJaguarTheme;
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

              {/* Jade altar — compact 3×3 square */}
              <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center px-2 py-3 sm:px-4 sm:py-4">
                {showTumbleBadge && (
                  <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
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
          {!inFree && (
            <div className="mt-1 flex shrink-0 justify-center gap-1.5 sm:mt-2 sm:gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => openBuyFeature("normal")}
                className="min-h-9 rounded-xl border-2 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide disabled:opacity-40 sm:min-h-10 sm:px-4 sm:py-2 sm:text-[11px]"
                style={{
                  borderColor: "var(--p-accent)",
                  color: "var(--p-accent-soft)",
                }}
              >
                Buy FS {formatMoneyCompact(buyCost)}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openBuyFeature("super")}
                className="min-h-9 rounded-xl border-2 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide disabled:opacity-40 sm:min-h-10 sm:px-4 sm:py-2 sm:text-[11px]"
                style={{
                  borderColor: "var(--p-accent)",
                  color: "var(--p-accent-soft)",
                }}
              >
                Super {formatMoneyCompact(superBuyCost)}
              </button>
            </div>
          )}

          {/* HUD — compact on Android so Spin sits above the system nav */}
          <div className="mt-1 w-full min-w-0 shrink-0 sm:mt-3">
            <div className="mb-1.5 grid grid-cols-3 gap-1 sm:mb-2 sm:gap-2">
              <div
                className="min-w-0 rounded-xl border bg-black/75 px-1 py-1.5 text-center sm:px-2 sm:py-2.5"
                style={{ borderColor: "var(--p-hud-border)" }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-wider sm:text-[11px]"
                  style={{ color: "var(--p-hud-label)" }}
                >
                  Bet
                </div>
                <div
                  className="break-all text-[11px] font-black tabular-nums leading-tight sm:text-base"
                  style={{ color: "var(--p-hud-value)" }}
                >
                  {formatMoney(totalBet)}
                </div>
              </div>
              <div
                className="min-w-0 rounded-xl border px-1 py-1.5 text-center sm:px-2 sm:py-2.5"
                style={{
                  borderColor: "var(--p-win-border)",
                  background:
                    "linear-gradient(180deg, var(--p-win-from) 0%, var(--p-win-to) 100%)",
                }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-wider sm:text-[11px]"
                  style={{ color: "var(--p-win-label)" }}
                >
                  Win
                </div>
                <div
                  className="break-all text-[11px] font-black tabular-nums leading-tight sm:text-base"
                  style={{ color: "var(--p-win-value)" }}
                  title={displayWin > 0 ? formatMoney(displayWin) : undefined}
                >
                  {displayWin > 0 ? formatMoney(displayWin) : "—"}
                </div>
              </div>
              <div
                className="min-w-0 rounded-xl border bg-black/75 px-1 py-1.5 text-center sm:px-2 sm:py-2.5"
                style={{ borderColor: "var(--p-hud-border)" }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-wider sm:text-[11px]"
                  style={{ color: "var(--p-hud-label)" }}
                >
                  Balance
                </div>
                <div
                  className="break-all text-[11px] font-black tabular-nums leading-tight sm:text-base"
                  style={{ color: "var(--p-hud-value)" }}
                  title={formatMoney(balance)}
                >
                  {formatMoney(balance)}
                </div>
              </div>
            </div>

            <div
              className="flex min-w-0 items-center gap-1 rounded-2xl border bg-black/80 px-1 py-1.5 backdrop-blur-md sm:gap-3 sm:px-3 sm:py-2.5"
              style={{ borderColor: "var(--p-hud-border)" }}
            >
              <button
                type="button"
                onClick={() => {
                  jadeJaguarAudio.playUiClick();
                  setInfoOpen(true);
                }}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-neutral-800 text-white sm:size-11"
                aria-label="Paytable Info"
              >
                <Info size={20} />
              </button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-xl border border-white/15 bg-neutral-900/90 px-0.5 py-0.5 sm:gap-1.5 sm:px-1.5 sm:py-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => nudgeBet(-1)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-700 text-lg font-black text-white disabled:opacity-40 sm:size-10 sm:text-xl"
                  aria-label="Decrease Bet"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setBetModalOpen(true)}
                  className="min-w-0 flex-1 px-0.5 text-center disabled:opacity-40 sm:min-w-[4.25rem] sm:flex-none sm:px-1"
                  aria-label="Select Bet Amount"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/55 sm:text-[10px]">
                    Bet
                  </div>
                  <div className="truncate text-xs font-black tabular-nums sm:text-base" style={{ color: "var(--p-win-value)" }}>
                    {formatMoney(totalBet)}
                  </div>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => nudgeBet(1)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-700 text-lg font-black text-white disabled:opacity-40 sm:size-10 sm:text-xl"
                  aria-label="Increase Bet"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setTurbo((v) => !v)}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl border sm:size-11",
                  !turbo && "border-white/20 bg-neutral-800 text-white/70",
                )}
                style={
                  turbo
                    ? {
                        borderColor: "var(--p-accent)",
                        background: "color-mix(in srgb, var(--p-accent) 25%, transparent)",
                        color: "var(--p-win-value)",
                      }
                    : undefined
                }
                aria-label="Turbo Fast Mode"
              >
                <FastForward size={18} />
              </button>

              <button
                type="button"
                disabled={!busy && !autoSpin && inFree && freeSpins === 0}
                onClick={() => {
                  if (busy) {
                    skipRef.current = true;
                    if (inFree || freeSpins > 0) setFsPaused(true);
                  } else if (autoSpin) {
                    setAutoSpin(false);
                    setAutoSpinConfig(null);
                  } else if (inFree || freeSpins > 0) {
                    setFsPaused(false);
                    void spin(true);
                  } else {
                    void spin(false);
                  }
                }}
                className="relative grid size-14 shrink-0 place-items-center rounded-full border-[3px] active:scale-95 sm:size-16"
                style={{
                  borderColor: "var(--p-accent-soft)",
                  background:
                    "linear-gradient(180deg, var(--p-spin-from) 0%, var(--p-spin-mid) 50%, var(--p-spin-to) 100%)",
                  color: "var(--p-accent-deep)",
                  boxShadow: "0 6px 22px var(--p-spin-shadow)",
                }}
                aria-label="Spin"
              >
                <div className="absolute inset-1 flex items-center justify-center rounded-full bg-gradient-to-b from-neutral-900 to-black shadow-inner sm:inset-1.5">
                  {inFree ? (
                    <div className="flex flex-col items-center -space-y-0.5">
                      <span
                        className="text-xl font-black tabular-nums leading-none sm:text-2xl"
                        style={{ color: "var(--p-win-value)" }}
                      >
                        {freeSpins}
                      </span>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest sm:text-[9px]"
                        style={{ color: "var(--p-accent)" }}
                      >
                        Spins
                      </span>
                    </div>
                  ) : autoSpin ? (
                    <div className="flex flex-col items-center -space-y-0.5">
                      <span
                        className="text-xl font-black tabular-nums leading-none sm:text-2xl"
                        style={{ color: "var(--p-win-value)" }}
                      >
                        {remainingAutoSpins === "infinity" ? "∞" : remainingAutoSpins}
                      </span>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest sm:text-[9px]"
                        style={{ color: "var(--p-accent)" }}
                      >
                        Auto
                      </span>
                    </div>
                  ) : busy ? (
                    <RotateCw size={24} className="animate-spin sm:size-7" style={{ color: "var(--p-win-value)" }} />
                  ) : (
                    <RotateCw size={24} className="sm:size-7" style={{ color: "var(--p-win-value)" }} />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (busy || autoSpin || inFree) {
                    setAutoSpin(false);
                    setAutoSpinConfig(null);
                    skipRef.current = true;
                    if (inFree) setFsPaused(true);
                  } else {
                    setAutoSpinModalOpen(true);
                  }
                }}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl border sm:size-11",
                  busy || autoSpin || (inFree && !fsPaused)
                    ? "border-red-500 bg-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.85)]"
                    : "border-white/20 bg-neutral-800 text-white/70",
                )}
                aria-label={busy || autoSpin || inFree ? "Stop Game" : "Auto Spin Settings"}
              >
                {busy || autoSpin || (inFree && !fsPaused) ? (
                  <Square size={16} className="fill-white text-white" />
                ) : (
                  <RotateCcw size={18} />
                )}
              </button>
            </div>

            {busy && displayWin <= 0 && (
              <p className="mt-1 hidden text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70 sm:mt-1.5 sm:block sm:text-xs">
                Spinning…
              </p>
            )}
            {!busy && displayWin <= 0 && !inFree && (
              <p className="mt-1 hidden text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/55 sm:mt-1.5 sm:block sm:text-xs">
                Good luck
              </p>
            )}
          </div>
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
        {infoOpen && (
          <PaytableModal bet={totalBet} onClose={() => setInfoOpen(false)} />
        )}
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
          <FreeSpinsTriggerModal
            count={triggerModalCount}
            onClose={dismissTriggerModal}
          />
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
