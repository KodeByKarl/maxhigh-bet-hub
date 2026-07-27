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
import { FastForward, Info, Menu, RotateCcw, RotateCw, Square, Volume2, VolumeX, Zap } from "lucide-react";
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
import { PantherFeatureBadge } from "./golden-panther/PantherFeatureBadge";
import { FreeSpinsBadge } from "./golden-panther/FreeSpinsBadge";
import { GoldenPantherSidePanel } from "./golden-panther/GoldenPantherSidePanel";
import { BetSelectModal } from "./golden-panther/BetSelectModal";
import { initialBoard, nextKey, buildBoard } from "./golden-panther/gridState";
import {
  BET_STEPS,
  ICON_SRC,
  getAnteMult,
  getBuyFeatureMult,
  getFreeSpinsBase,
  getSuperBuyFeatureMult,
} from "./golden-panther/paytable";
import { getRuntimeSymbols, setGoldenPantherConfig } from "./golden-panther/runtimeConfig";
import type { BoardCell, SpinScript } from "./golden-panther/types";
import { CELLS, COLS, MAIN_CELLS, ROWS, TOP_COLS } from "./golden-panther/types";
import { WinCelebration } from "./golden-panther/WinCelebration";
import { FreeSpinsCongrats } from "./golden-panther/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./golden-panther/FreeSpinsTriggerModal";
import { BuyFeatureModal } from "./golden-panther/BuyFeatureModal";
import { PaytableModal } from "./golden-panther/PaytableModal";
import { GameMenuModal } from "./golden-panther/GameMenuModal";
import { AutoSpinModal, type AutoSpinOptions } from "./golden-panther/AutoSpinModal";
import { WinLedger, mergeLedgerRows, type LedgerRow } from "./golden-panther/WinLedger";
import { ReelCell, type ReelPhase } from "./golden-panther/ReelCell";
import { getGoldenPantherEngineConfigFn } from "@/functions/superadmin";
import { GOLDEN_PANTHER_GAME_ID } from "@/lib/golden-panther-config";

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
    "/images/symbols/panther/backdrop.png",
    "/images/symbols/panther/loading-bg.png",
    ...Object.values(ICON_SRC),
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
          if (!mountedRef.current || !session.sessionId) return;
          playSessionIdRef.current = session.sessionId;
          setInFree(session.inFree);
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
          for (const k of c.keys) payMap.set(k, c.perSymbol);
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
        await wait(
          ANIM.popDuration + Math.min(step.winningKeys.length, 12) * ANIM.popStagger,
          gen,
        );

        setSlots(
          step.afterPop.length === CELLS ? step.afterPop : asSlots(step.board),
        );
        setWinningKeys(EMPTY_SET);
        setPayoutByKey(EMPTY_PAY);
        await wait(ANIM.holeHold, gen);

        setFallenKeys(new Set(step.fallenKeys));
        setSpawnedKeys(new Set(step.spawnedKeys));
        setFallDistance(step.fallDistance ?? EMPTY_FALL);
        setSlots(asSlots(step.afterFall));
        setPhase("falling");
        await wait(
          ANIM.refillDuration + COLS * ANIM.fallStaggerCol + ANIM.fallStaggerRow * 2,
          gen,
        );
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
  }, []);

  const finishBase = useCallback(
    (script: SpinScript, session: { sessionId: string | null; freeSpinsLeft: number; inFree: boolean }) => {
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
      const isFree = asFree || (inFree && freeSpinsRef.current > 0);
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

      try {
        if (!isFree) {
          setBalanceLocal(balance - cost);
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
          setLedger([]);
          setDropTotal(0);
        }

        void refreshJackpot();
        applySession(settled.session);

        const script = await playScript(settled.script, isFree, gen, isFree ? balance : balance - cost);
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
          console.error("[GoldenPanther] spin failed", err);
          toast.error(err instanceof Error ? err.message : "Spin failed — try again");
          setAutoSpin(false);
        }
      } finally {
        if (gen === playbackGen.current) {
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

    setBuyOpen(false);
    try {
      const bought = await goldenPantherBuyFeatureFn({
        data: { bet, mode: buyMode },
      });
      setBalanceLocal(bought.balance);
      void refreshJackpot();
      applySession(bought.session);
      if (buyMode === "super") setAnte(true);
      setTriggerModalCount(bought.session.freeSpinsLeft || getFreeSpinsBase());
      pantherAudio.playScatterTrigger();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Buy feature failed");
      return;
    }

    setBanner(null);
    setWinPopup(null);
    setFsSummary(null);
    setLedger([]);
    setDropTotal(0);
    setLastWin(0);

    setBanner(
      buyMode === "super"
        ? `SUPER FREE SPINS · ${getFreeSpinsBase()}`
        : `BUY FREE SPINS · ${getFreeSpinsBase()}`,
    );
    pantherAudio.playScatterTrigger();
    schedule(() => setBanner(null), 1400);

    const gen = ++playbackGen.current;
    busyRef.current = true;
    try {
      const seeded = buildBoard(true, true, false);
      // Fisher–Yates for scatter seed positions (unbiased vs sort-shuffle).
      const indices = ALL_BOARD_INDICES.slice() as number[];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let k = 0; k < 4; k++) {
        seeded[indices[k]] = {
          key: nextKey(),
          sym: scatterSym(),
        };
      }
      setSlots(asSlots(seeded));
      await wait(turboRef.current ? 350 : 650, gen);
    } catch {
      /* aborted */
    } finally {
      if (gen === playbackGen.current) {
        busyRef.current = false;
        if (mountedRef.current) setPhase("idle");
      }
    }

    if (mountedRef.current && gen === playbackGen.current) {
      await spinRef.current(true);
    }
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
    if (winPopup || fsSummary || buyOpen || menuOpen || infoOpen || autoSpinModalOpen || betModalOpen || triggerModalCount != null) return;

    if (inFree && freeSpins > 0 && !fsPaused) {
      const t = setTimeout(() => {
        void spinRef.current(true);
      }, turbo ? 350 : 700);
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
        autoSpinConfig?.spinWithoutReels ? 120 : turbo ? 350 : 700
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

  const displayWin = dropTotal > 0 ? dropTotal : (inFree ? fsSessionWin : lastWin);
  const showTumbleBadge =
    dropTotal > 0 &&
    (phase === "glow" || phase === "popping" || phase === "falling");

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none">
      <img
        src="/images/symbols/panther/backdrop.png"
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />

      {/* Centered playfield */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1200px] flex-col items-center gap-1.5 sm:gap-2">
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">

            {/* GRID COLUMN */}
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 w-full max-w-[840px] flex-col items-center justify-center"
                style={{
                  width: "min(100%, 800px)",
                }}
              >
                {/* 1ST LAYER: 4 COLUMNS TOP TRACKER REEL */}
                <div className="-mb-[2px] relative z-10 flex shrink-0 justify-center w-full">
                  <div
                    className="relative flex items-center justify-center rounded-t-2xl rounded-b-none p-1 sm:p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                    style={{
                      width: "calc(100% * (4 / 6))",
                      background: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
                      border: "2px solid #6b7280",
                      borderBottom: "none",
                    }}
                  >
                    <div
                      className="grid size-full rounded-t-xl rounded-b-none overflow-hidden"
                      style={{
                        background: "linear-gradient(180deg, #111827 0%, #030712 100%)",
                        boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gridTemplateRows: "repeat(1, minmax(0, 1fr))",
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
                </div>

                {/* 2ND LAYER: 6 COLUMNS x 7 ROWS MAIN GRID */}
                <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                  <div
                    className="relative mx-auto size-full max-h-full"
                    style={{
                      aspectRatio: `${COLS} / ${ROWS}`,
                      width: "100%",
                      height: "auto",
                      maxHeight: "100%",
                    }}
                  >
                    {showTumbleBadge && (
                      <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                        <div
                          className="rounded-full border-2 border-yellow-300 px-4 py-1.5 text-center shadow-[0_0_20px_rgba(250,204,21,0.8)]"
                          style={{
                            background:
                              "linear-gradient(180deg, #D97706 0%, #78350F 100%)",
                          }}
                        >
                          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                            Tumble Win
                          </div>
                          <div className="text-lg font-black leading-none text-yellow-300 tabular-nums">
                            {formatMoney(dropTotal)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reel Grid Concrete Frame */}
                    <div
                      className="relative size-full rounded-3xl p-2 sm:p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                      style={{
                        background: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
                        border: "2px solid #6b7280",
                      }}
                    >
                      <div
                        className="relative size-full overflow-hidden rounded-2xl"
                        style={{
                          background: "linear-gradient(180deg, #111827 0%, #030712 100%)",
                          boxShadow: "inset 0 0 30px rgba(0,0,0,0.9)",
                        }}
                      >
                        <div
                          className="grid size-full"
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
                </div>

                {!inFree && (
                  <div className="mt-1 flex shrink-0 gap-2 sm:hidden">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openBuyFeature("normal")}
                      className="rounded-lg border-2 border-[#E8C547] bg-[#1A1A1A] px-3 py-1.5 text-[10px] font-black uppercase text-[#F5D76E]"
                    >
                      Buy FS {formatMoneyCompact(buyCost)}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openBuyFeature("super")}
                      className="rounded-lg border-2 border-[#E8C547] bg-[#1A1A1A] px-3 py-1.5 text-[10px] font-black uppercase text-[#F5D76E]"
                    >
                      Super {formatMoneyCompact(superBuyCost)}
                    </button>
                  </div>
                )}

                {/* BOTTOM CONTROL BAR (Spadegaming Style) */}
                <div className="mt-2 w-full shrink-0 max-w-[1100px] mx-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/85 p-2 backdrop-blur-md border border-amber-500/25 shadow-2xl">
                    
                    {/* LEFT SECTION: Info Button & Bet Adjuster */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        className="grid size-9 place-items-center rounded-full bg-neutral-800 text-white/80 border border-white/20 hover:bg-neutral-700 hover:text-white transition shadow sm:size-10"
                        aria-label="Paytable Info"
                      >
                        <Info size={18} />
                      </button>

                      <div className="flex items-center gap-1.5 bg-neutral-900/90 rounded-full px-2.5 py-1 border border-white/10 shadow-inner sm:px-3 sm:py-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-6 place-items-center rounded-full bg-neutral-700 text-white font-bold text-sm hover:bg-neutral-600 disabled:opacity-40 transition sm:size-7 sm:text-base"
                          aria-label="Decrease Bet"
                        >
                          −
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setBetModalOpen(true)}
                          className="flex flex-col items-center px-1 hover:opacity-80 transition cursor-pointer disabled:cursor-not-allowed"
                          aria-label="Select Bet Amount"
                        >
                          <span className="text-[9px] uppercase tracking-wider text-white/60 font-bold">
                            Bet
                          </span>
                          <span className="text-xs font-black tabular-nums text-yellow-300 border-b-2 border-purple-500 px-1 sm:text-sm">
                            {totalBet.toFixed(2)}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => nudgeBet(1)}
                          className="grid size-6 place-items-center rounded-full bg-neutral-700 text-white font-bold text-sm hover:bg-neutral-600 disabled:opacity-40 transition sm:size-7 sm:text-base"
                          aria-label="Increase Bet"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* CENTER SECTION: Total Bet | Good Luck! | Balance */}
                    <div className="flex flex-1 items-center justify-center max-w-[500px] min-w-[240px] mx-auto">
                      <div className="flex w-full items-stretch rounded-full bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 p-0.5 shadow-lg">
                        {/* Total Bet Pill */}
                        <div className="flex flex-col justify-center rounded-l-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 px-3 py-1 text-center text-amber-950 min-w-[80px] sm:px-4 sm:min-w-[95px]">
                          <span className="text-[9px] font-black uppercase tracking-tight opacity-80">
                            Total Bet
                          </span>
                          <span className="text-xs font-black tabular-nums leading-none sm:text-sm">
                            {totalBet.toFixed(2)}
                          </span>
                        </div>

                        {/* Status Message */}
                        <div className="flex flex-1 items-center justify-center bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 px-3 py-1.5 text-center text-white min-h-[38px] sm:px-4">
                          <span className="text-xs font-black tracking-wide text-yellow-200 sm:text-sm">
                            {displayWin > 0
                              ? `Win ₱${displayWin.toFixed(2)}`
                              : busy
                              ? "Spinning..."
                              : "Good Luck!"}
                          </span>
                        </div>

                        {/* Balance Pill */}
                        <div className="flex flex-col justify-center rounded-r-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 px-3 py-1 text-center text-amber-950 min-w-[95px] sm:px-4 sm:min-w-[115px]">
                          <span className="text-[9px] font-black uppercase tracking-tight opacity-80">
                            Balance
                          </span>
                          <span className="text-xs font-black tabular-nums leading-none sm:text-sm">
                            {balance.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SECTION: Turbo + Circular Spin (with count) + AutoSpin */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Turbo Fast Button */}
                      <button
                        type="button"
                        onClick={() => setTurbo((v) => !v)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full border transition shadow sm:size-10",
                          turbo
                            ? "border-amber-400 bg-amber-400/20 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                            : "border-white/20 bg-neutral-800 text-white/60 hover:bg-neutral-700 hover:text-white"
                        )}
                        aria-label="Turbo Fast Mode"
                      >
                        <FastForward size={18} />
                      </button>

                      {/* Main Spin / STOP Button */}
                      <button
                        type="button"
                        disabled={!busy && !autoSpin && inFree && freeSpins === 0}
                        onClick={() => {
                          if (busy) {
                            skipRef.current = true;
                            if (inFree) setFsPaused(true);
                          } else if (autoSpin) {
                            setAutoSpin(false);
                            setAutoSpinConfig(null);
                          } else if (inFree) {
                            setFsPaused(false);
                            void spin(true);
                          } else {
                            void spin(false);
                          }
                        }}
                        className="relative grid size-14 place-items-center rounded-full border-[3px] border-amber-300 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 text-amber-950 shadow-[0_6px_20px_rgba(217,119,6,0.6)] transition sm:size-16 active:scale-95 hover:brightness-110"
                        aria-label="Spin"
                      >
                        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-neutral-900 to-black flex items-center justify-center shadow-inner">
                          {inFree ? (
                            <div className="flex flex-col items-center justify-center -space-y-0.5">
                              <span className="text-xl font-black tabular-nums leading-none text-yellow-300 sm:text-2xl">
                                {freeSpins}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 sm:text-[9px]">
                                Spins
                              </span>
                            </div>
                          ) : autoSpin ? (
                            <div className="flex flex-col items-center justify-center -space-y-0.5">
                              <span className="text-xl font-black tabular-nums leading-none text-yellow-300 sm:text-2xl">
                                {remainingAutoSpins === "infinity" ? "∞" : remainingAutoSpins}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 sm:text-[9px]">
                                Auto
                              </span>
                            </div>
                          ) : busy ? (
                            <RotateCw
                              size={24}
                              className="text-yellow-300 animate-spin"
                            />
                          ) : (
                            <RotateCw
                              size={24}
                              className="text-yellow-300"
                            />
                          )}
                        </div>
                      </button>

                      {/* STOP / Auto Spin Button */}
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
                          "grid size-9 place-items-center rounded-full border transition shadow sm:size-10",
                          busy || autoSpin || (inFree && !fsPaused)
                            ? "border-red-500 bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-pulse cursor-pointer hover:bg-red-700"
                            : "border-white/20 bg-neutral-800 text-white/60 hover:bg-neutral-700 hover:text-white"
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

                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block" aria-hidden />
          </div>
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
            bet={bet}
            cost={activeBuyCost}
            balance={balance}
            onBetChange={setBet}
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
