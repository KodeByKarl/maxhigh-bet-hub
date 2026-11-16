import { SlotControlDeck } from "./SlotControlDeck";
/**
 * Wild Panther — Sweet Bonanza layout (cluster-pay tumble slot).
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
import {
  FastForward,
  Info,
  Menu,
  RotateCcw,
  RotateCw,
  Square,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { pantherAudio } from "./wild-panther/audio";
import {
  wildPantherBuyFeatureFn,
  wildPantherFreeSpinFn,
  wildPantherSpinFn,
  getWildPantherSessionFn,
} from "@/functions/api";
import { ANIM } from "./wild-panther/animationConfig";
import { WildPantherFeatureBadge } from "./wild-panther/WildPantherFeatureBadge";
import { FreeSpinsBadge } from "./wild-panther/FreeSpinsBadge";
import { BetSelectModal } from "./wild-panther/BetSelectModal";
import { initialBoard, nextKey, buildBoard } from "./wild-panther/gridState";
import {
  BET_STEPS,
  ICON_SRC,
  getAnteMult,
  getBuyFeatureMult,
  getFreeSpinsBase,
  getSuperBuyFeatureMult,
} from "./wild-panther/paytable";
import { getRuntimeSymbols, setWildPantherConfig } from "./wild-panther/runtimeConfig";
import type { BoardCell, SpinScript } from "./wild-panther/types";
import { CELLS, COLS, MAIN_CELLS, ROWS, TOP_COLS } from "./wild-panther/types";
import { WinCelebration } from "./wild-panther/WinCelebration";
import { FreeSpinsCongrats } from "./wild-panther/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./wild-panther/FreeSpinsTriggerModal";
import { freeSpinsProgress } from "./bonus/freeSpinsProgress";
import { BuyFeatureModal } from "./wild-panther/BuyFeatureModal";
import { PaytableModal } from "./wild-panther/PaytableModal";
import { GameMenuModal } from "./wild-panther/GameMenuModal";
import { AutoSpinModal, type AutoSpinOptions } from "./wild-panther/AutoSpinModal";
import { WinLedger, mergeLedgerRows, type LedgerRow } from "./wild-panther/WinLedger";
import { ReelCell, type ReelPhase } from "./wild-panther/ReelCell";
import { getWildPantherEngineConfigFn } from "@/functions/superadmin";
import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";

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
const ALL_BOARD_INDICES = Object.freeze(Array.from({ length: CELLS }, (_, i) => i));

function scatterSym() {
  return getRuntimeSymbols().find((s) => s.scatter)!;
}

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
    "/images/symbols/wild-panther/backdrop-v20261012-unique.webp",
    "/images/symbols/wild-panther/backdrop-v20261012-unique.webp",
    ...Object.values(ICON_SRC),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function WildPantherSlot({
  gameId = "wild-panther",
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
  const [fsBombAcc, setFsBombAcc] = useState(0);
  const [fsSessionWin, setFsSessionWin] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [dropTotal, setDropTotal] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<WinPopup | null>(null);
  const [fsSummary, setFsSummary] = useState<FsSummary | null>(null);
  const [triggerModalCount, setTriggerModalCount] = useState<number | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyMode, setBuyMode] = useState<"normal" | "super">("normal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [fsPaused, setFsPaused] = useState(false);
  const [muted, setMuted] = useState(() => pantherAudio.isMuted);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = +(bet * getBuyFeatureMult()).toFixed(2);
  const superBuyCost = +(bet * getSuperBuyFeatureMult()).toFixed(2);
  const activeBuyCost = buyMode === "super" ? superBuyCost : buyCost;

  const busyRef = useRef(false);
  const skipRef = useRef(false);
  const turboRef = useRef(turbo);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const freeSpinsRef = useRef(freeSpins);
  const fsSessionRef = useRef(fsSessionWin);
  const fsBombRef = useRef(fsBombAcc);
  const fsSpinsPlayedRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const spinRef = useRef<(asFree?: boolean) => Promise<void>>(async () => undefined);

  turboRef.current = turbo;
  freeSpinsRef.current = freeSpins;
  fsSessionRef.current = fsSessionWin;
  fsBombRef.current = fsBombAcc;

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

  /** Abortable wait — respects turbo + skipRef + playback generation / unmount. */
  const wait = useCallback((ms: number, gen: number) => {
    if (skipRef.current) return Promise.resolve();
    const scaled = turboRef.current ? Math.min(ms, 60) : ms;
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

  useEffect(() => {
    mountedRef.current = true;
    preloadAssets();
    pantherAudio.preload();
    if (gameId === WILD_PANTHER_GAME_ID || gameId === "wild-panther") {
      void getWildPantherEngineConfigFn()
        .then((cfg) => {
          if (mountedRef.current) setWildPantherConfig(cfg);
        })
        .catch(() => {
          /* keep defaults */
        });
      void getWildPantherSessionFn()
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
          setFsBombAcc(session.fsBombAcc);
          setFsSessionWin(session.fsSessionWin);
          freeSpinsRef.current = session.freeSpinsLeft;
          fsBombRef.current = session.fsBombAcc;
          fsSessionRef.current = session.fsSessionWin;
          fsSpinsPlayedRef.current = session.fsSpinsPlayed;
          if (session.bet > 0) setBet(session.bet);
          setAnte(session.ante);
        })
        .catch(() => undefined);
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
    if (gameId !== WILD_PANTHER_GAME_ID && gameId !== "wild-panther") return;
    try {
      const cfg = await getWildPantherEngineConfigFn();
      if (mountedRef.current) setWildPantherConfig(cfg);
    } catch {
      /* keep last known */
    }
  }, [gameId]);

  const applySession = useCallback(
    (session: {
      sessionId: string | null;
      freeSpinsLeft: number;
      fsSessionWin: number;
      fsBombAcc: number;
      fsSpinsPlayed: number;
      inFree: boolean;
    }) => {
      playSessionIdRef.current = session.sessionId;
      setInFree(session.inFree);
      setFreeSpins(session.freeSpinsLeft);
      setFsBombAcc(session.fsBombAcc);
      setFsSessionWin(session.fsSessionWin);
      freeSpinsRef.current = session.freeSpinsLeft;
      fsBombRef.current = session.fsBombAcc;
      fsSessionRef.current = session.fsSessionWin;
      fsSpinsPlayedRef.current = session.fsSpinsPlayed;
      setFsPlayed(session.fsSpinsPlayed);
    },
    [],
  );

  const playScript = useCallback(
    async (script: SpinScript, isFree: boolean, gen: number, startBalance: number) => {
      if (!isFree) {
        setLedger([]);
      }
      setDropTotal(0);
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      let running = 0;
      let currentBal = startBalance;
      const rows: LedgerRow[] = [];

      if (skipRef.current) {
        const lastStep = script.steps[script.steps.length - 1];
        const finalBoard = lastStep ? lastStep.afterFall : script.initialBoard;
        setSlots(asSlots(finalBoard));
        running = script.totalWin;
        currentBal = startBalance + script.totalWin;
        setBalanceLocal(currentBal);
        setDropTotal(running);
        if (isFree && running > 0) {
          setLastWin(+(fsSessionRef.current + running).toFixed(2));
        }
      } else {
        setPhase("dropping");
        setSlots(asSlots(script.initialBoard));
        pantherAudio.startSpinLoop();
        await wait(
          ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow,
          gen,
        );
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
          running = script.totalWin;
          currentBal = startBalance + script.totalWin;
          setBalanceLocal(currentBal);
          setDropTotal(running);
          if (isFree && running > 0) {
            setLastWin(+(fsSessionRef.current + running).toFixed(2));
          }
          break;
        }

        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
        setSlots(asSlots(step.board));
        setWinningKeys(new Set(step.winningKeys));
        const payMap = new Map<string, number>();
        const stepRows: LedgerRow[] = [];
        for (const c of step.clusters) {
          const badgeKey = c.keys[0];
          if (badgeKey) payMap.set(badgeKey, c.pay);
          const row = { id: c.id, kind: c.kind, count: c.count, pay: c.pay };
          stepRows.push(row);
          rows.push(row);
        }
        setPayoutByKey(payMap);
        if (isFree) {
          setLedger((prev) => mergeLedgerRows([...prev, ...stepRows]));
        } else {
          setLedger(mergeLedgerRows(rows));
        }
        running += step.tumbleWin;
        if (step.tumbleWin > 0) {
          currentBal += step.tumbleWin;
          setBalanceLocal(currentBal);
        }
        setDropTotal(running);
        if (isFree && running > 0) {
          setLastWin(+(fsSessionRef.current + running).toFixed(2));
        }

        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
        pantherAudio.playCascadeTick();
        await wait(ANIM.popDuration + Math.min(step.winningKeys.length, 12) * ANIM.popStagger, gen);

        setSlots(step.afterPop.length === CELLS ? step.afterPop : asSlots(step.board));
        setWinningKeys(EMPTY_SET);
        setPayoutByKey(EMPTY_PAY);
        await wait(ANIM.holeHold, gen);

        setFallenKeys(new Set(step.fallenKeys));
        setSpawnedKeys(new Set(step.spawnedKeys));
        setFallDistance(step.fallDistance ?? EMPTY_FALL);
        setSlots(asSlots(step.afterFall));
        setPhase("falling");
        await wait(ANIM.refillDuration + COLS * ANIM.fallStaggerCol + ANIM.fallStaggerRow * 2, gen);
        await wait(ANIM.betweenTumbles, gen);
      }

      if (gen === playbackGen.current) {
        setPhase("idle");
        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
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
      schedule(() => setWinPopup(null), ANIM.bannerHold + 1600);
    },
    [schedule],
  );

  const dismissFsSummary = useCallback(() => {
    setFsSummary(null);
    fsSpinsPlayedRef.current = 0;
    setFsPlayed(0);
  }, []);

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
          fsBombAcc: 0,
          fsSpinsPlayed: 0,
          inFree: true,
        });
        setLastWin(0);
        setLedger([]);
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
      // Claim the spin synchronously. The session lookup below is async; without this claim a rapid double-tap
      // passes the guard more than once and places several wagers.
      busyRef.current = true;

      // Prefer free-spin path whenever local OR server still has FS left.
      // (inFree state can desync after HMR / modal / skip — freeSpinsRef is source of truth.)
      let preferFree = asFree || freeSpinsRef.current > 0;

      if (!preferFree || (preferFree && !playSessionIdRef.current)) {
        try {
          const session = await getWildPantherSessionFn();
          if (session.sessionId && session.freeSpinsLeft > 0) {
            applySession({
              sessionId: session.sessionId,
              freeSpinsLeft: session.freeSpinsLeft,
              fsSessionWin: session.fsSessionWin,
              fsBombAcc: session.fsBombAcc,
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
        busyRef.current = false;
        return;
      }

      const cost = isFree ? 0 : totalBet;

      if (!isFree && balance < cost) {
        toast.error("Insufficient balance");
        setAutoSpin(false);
        busyRef.current = false;
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
        }
        await refreshEngineConfig();

        let settled: Awaited<ReturnType<typeof wildPantherSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired — refresh and try again");
            setAutoSpin(false);
            return;
          }
          settled = await wildPantherFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await wildPantherSpinFn({ data: { bet, ante } });
          setLedger([]);
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
          setFsBombAcc(settled.session.fsBombAcc);
          setLastWin(settled.session.fsSessionWin || settled.fsPayout?.amount || 0);
          fsSessionRef.current = settled.session.fsSessionWin;
          fsBombRef.current = settled.session.fsBombAcc;
          fsSpinsPlayedRef.current = settled.session.fsSpinsPlayed;

          if (script.retriggerSpins > 0 && settled.session.inFree) {
            pantherAudio.playScatterTrigger();
            setBanner(`+${script.retriggerSpins} FREE SPINS!`);
            schedule(() => setBanner(null), 1400);
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
            setFsBombAcc(0);
            setFsSessionWin(0);
            fsBombRef.current = 0;
            fsSessionRef.current = 0;
            if (settled.fsPayout.amount > 0) {
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
              const session = await getWildPantherSessionFn();
              if (session.sessionId && session.freeSpinsLeft > 0) {
                applySession({
                  sessionId: session.sessionId,
                  freeSpinsLeft: session.freeSpinsLeft,
                  fsSessionWin: session.fsSessionWin,
                  fsBombAcc: session.fsBombAcc,
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
          console.error("[WildPanther] spin failed", err);
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
      setBuyMode(mode);
      setBuyOpen(true);
    },
    [inFree, phase],
  );

  const buyFeature = useCallback(async () => {
    if (busyRef.current || phase !== "idle") return;
    const cost = buyMode === "super" ? superBuyCost : buyCost;
    if (balance < cost) {
      toast.error("Insufficient balance");
      return;
    }

    // Claim synchronously: the purchase below is awaited, so a rapid double-tap on Buy would otherwise buy twice.
    busyRef.current = true;
    setBuyOpen(false);
    setBuyPresenting(true);
    let awardedSpins = getFreeSpinsBase();
    try {
      const bought = await wildPantherBuyFeatureFn({
        data: { bet, mode: buyMode },
      });
      setBalanceLocal(bought.balance);
      void refreshJackpot();
      applySession(bought.session);
      if (buyMode === "super") setAnte(true);
      awardedSpins = bought.session.freeSpinsLeft || getFreeSpinsBase();
    } catch (err) {
      busyRef.current = false;
      toast.error(err instanceof Error ? err.message : "Buy feature failed");
      setBuyPresenting(false);
      return;
    }

    setBanner(null);
    setWinPopup(null);
    setFsSummary(null);
    setLedger([]);
    setDropTotal(0);
    setLastWin(0);

    // Scatter-triggered presentation. The purchase and the free-spin session are already settled by the server; nothing below
    // can change a price, a result or a payout. Sequence: (1) the reels spin with the game's own drop animation and land on the
    // scatter board, (2) the scatters glow with the game's own highlight and trigger sound, (3) the existing Free Spins
    // announcement opens, (4) the free spins then run automatically from 1/N. The scatter moment consumes NO free spin.
    const gen = ++playbackGen.current;
    busyRef.current = true;
    try {
      const board = buildBoard(true, true, false);
      const indices = ALL_BOARD_INDICES.slice() as number[];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // cell placement only (visual); never a result
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const scatterKeys = new Set<string>();
      for (let k = 0; k < 4; k++) {
        const key = nextKey();
        board[indices[k]] = { key, sym: scatterSym() };
        scatterKeys.add(key);
      }
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      setPhase("dropping");
      setSlots(asSlots(board));
      pantherAudio.startSpinLoop();
      await wait(ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow, gen);
      pantherAudio.stopSpinLoop();
      pantherAudio.playReelStop(5);
      setWinningKeys(scatterKeys);
      setPhase("glow");
      pantherAudio.playScatterTrigger();
      await wait(ANIM.glowDuration + 500, gen);
      setWinningKeys(EMPTY_SET);
      setPhase("idle");
      setBanner(`${awardedSpins} FREE SPINS!`);
      setTriggerModalCount(awardedSpins);
      setBuyPresenting(false);
      // the announcement closes by itself so the first free spin starts automatically (a tap still skips ahead)
      const autoCloseAnnouncement = schedule(
        () => setTriggerModalCount(null),
        turboRef.current ? 900 : 2400,
      );
      void autoCloseAnnouncement;
      schedule(() => setBanner(null), ANIM.bannerHold);
    } catch {
      /* aborted */
    } finally {
      if (gen === playbackGen.current) {
        busyRef.current = false;
        setBuyPresenting(false);
        if (mountedRef.current) setPhase("idle");
      }
    }
    // The free spins start from 1/N through the existing automatic chain once the announcement is dismissed.
  }, [
    applySession,
    balance,
    bet,
    buyCost,
    buyMode,
    phase,
    refreshJackpot,
    schedule,
    setBalanceLocal,
    superBuyCost,
    wait,
  ]);

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
      menuOpen ||
      infoOpen ||
      autoSpinModalOpen ||
      betModalOpen ||
      triggerModalCount != null
    )
      return;

    if (inFree && freeSpins > 0 && !fsPaused) {
      const t = setTimeout(
        () => {
          void spinRef.current(true);
        },
        turbo ? 350 : 700,
      );
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

      const t = setTimeout(
        () => {
          void spinRef.current(false);
        },
        autoSpinConfig?.spinWithoutReels ? 120 : turbo ? 350 : 700,
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
    menuOpen,
    infoOpen,
    winPopup,
    inFree,
    freeSpins,
    lastWin,
    triggerModalCount,
    fsPaused,
  ]);

  const setMutedState = useCallback((on: boolean) => {
    pantherAudio.setMuted(on);
    setMuted(on);
  }, []);

  const toggleMute = useCallback(() => setMutedState(!muted), [muted, setMutedState]);

  const displayWin = dropTotal > 0 ? dropTotal : inFree ? fsSessionWin : lastWin;
  const showTumbleBadge =
    dropTotal > 0 && (phase === "glow" || phase === "popping" || phase === "falling");

  // h-full: fill the (safe-area padded) game shell, not the whole viewport (h-dvh overflowed it by the inset total).
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden select-none">
      <img
        src="/images/symbols/wild-panther/backdrop-v20261012-unique.webp"
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />

      {/* Playfield — mobile-first, elder-readable */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-1.5 pt-1 pb-[0.35rem] sm:items-center sm:justify-center sm:px-3 sm:py-2">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[840px] flex-col">
          {/* Open temple well — thin gold rim, no heavy metal box */}
          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            <div
              className="relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.25rem] sm:rounded-2xl"
              style={{
                maxWidth: "min(100%, 800px)",
                background: "linear-gradient(180deg, rgba(12,8,4,0.55) 0%, rgba(8,5,3,0.72) 100%)",
                boxShadow:
                  "inset 0 0 0 1.5px rgba(245,215,110,0.55), inset 0 0 40px rgba(0,0,0,0.35), 0 12px 36px rgba(0,0,0,0.45)",
              }}
            >
              {/* Soft top glow */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.18) 0%, transparent 70%)",
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
                  {TOP_INDICES.map((i) => {
                    const cell = slots[i] ?? null;
                    const win = cell ? winningKeys.has(cell.key) : false;
                    return (
                      <ReelCell
                        key={`top-slot-${i}`}
                        index={i}
                        cell={cell}
                        phase={phase}
                        win={win}
                        perPay={cell ? payoutByKey.get(cell.key) : undefined}
                        isSpawn={cell ? spawnedKeys.has(cell.key) : false}
                        isFallen={cell ? fallenKeys.has(cell.key) : false}
                        fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
                        cols={4}
                        isTop={true}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Thin gold divider under top reel */}
              <div
                className="relative z-10 mx-auto my-0.5 h-px w-[92%] shrink-0 opacity-80"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(245,215,110,0.65), transparent)",
                }}
                aria-hidden
              />

              {/* MAIN 6×7 — open grid, no cell boxes */}
              <div className="relative z-10 min-h-0 w-full flex-1 px-0.5 pb-1">
                {showTumbleBadge && (
                  <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className="rounded-full border-2 border-yellow-300 px-4 py-1.5 text-center shadow-[0_0_20px_rgba(250,204,21,0.8)]"
                      style={{
                        background: "linear-gradient(180deg, #D97706 0%, #78350F 100%)",
                      }}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                        Tumble Win
                      </div>
                      <div className="text-lg font-black leading-none text-yellow-300 tabular-nums sm:text-xl">
                        {formatMoney(dropTotal)}
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
                    <div key={c} className="border-r border-amber-200/80 last:border-r-0" />
                  ))}
                </div>

                <div
                  className="relative z-[2] grid size-full overflow-visible"
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                  }}
                >
                  {MAIN_INDICES.map((i) => {
                    const cell = slots[i] ?? null;
                    const win = cell ? winningKeys.has(cell.key) : false;
                    return (
                      <ReelCell
                        key={`slot-${i}`}
                        index={i - TOP_COLS}
                        cell={cell}
                        phase={phase}
                        win={win}
                        perPay={cell ? payoutByKey.get(cell.key) : undefined}
                        isSpawn={cell ? spawnedKeys.has(cell.key) : false}
                        isFallen={cell ? fallenKeys.has(cell.key) : false}
                        fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
                        cols={COLS}
                        isTop={false}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Buy feature — larger taps on mobile */}

          {/* Elder-friendly HUD */}
          <SlotControlDeck
            gameId="wild-panther"
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
                void spin(true);
              } else {
                void spin(false);
              }
            }}
            onInfo={() => setInfoOpen(true)}
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
        {menuOpen && (
          <GameMenuModal
            turbo={turbo}
            muted={muted}
            onTurboChange={setTurbo}
            onMutedChange={setMutedState}
            onOpenPaytable={() => setInfoOpen(true)}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

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
            bet={bet}
            cost={activeBuyCost}
            balance={balance}
            onCancel={() => setBuyOpen(false)}
            onConfirm={() => {
              void buyFeature();
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
            onClose={() => setTriggerModalCount(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {banner && !winPopup && !fsSummary && !triggerModalCount && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
            <div className="rounded-2xl border-4 border-white bg-gradient-to-b from-yellow-300 to-yellow-600 px-10 py-5 text-center shadow-2xl">
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
