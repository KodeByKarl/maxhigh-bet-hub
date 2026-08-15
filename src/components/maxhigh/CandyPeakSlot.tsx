/**
 * Candy Peak — Sweet Bonanza layout (cluster-pay tumble slot).
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
import { Info, Menu, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { sounds } from "@/lib/sounds";
import {
  candyPeakBuyFeatureFn,
  candyPeakFreeSpinFn,
  candyPeakSpinFn,
  getCandyPeakSessionFn,
} from "@/functions/api";
import { ANIM } from "./candy-peak/animationConfig";
import { CandyFeatureBadge } from "./candy-peak/CandyFeatureBadge";
import { FreeSpinsBadge } from "./candy-peak/FreeSpinsBadge";
import { CandyPeakSidePanel } from "./candy-peak/CandyPeakSidePanel";
import { initialBoard, nextKey, buildBoard } from "./candy-peak/gridState";
import {
  BET_STEPS,
  ICON_SRC,
  getAnteMult,
  getBuyFeatureMult,
  getFreeSpinsBase,
  getSuperBuyFeatureMult,
} from "./candy-peak/paytable";
import { getRuntimeSymbols, setCandyPeakConfig } from "./candy-peak/runtimeConfig";
import type { BoardCell, SpinScript } from "./candy-peak/types";
import { CELLS, COLS, ROWS } from "./candy-peak/types";
import { WinCelebration } from "./candy-peak/WinCelebration";
import { FreeSpinsCongrats } from "./candy-peak/FreeSpinsCongrats";
import { FreeSpinsTriggerModal } from "./candy-peak/FreeSpinsTriggerModal";
import { BuyFeatureModal } from "./candy-peak/BuyFeatureModal";
import { PaytableModal } from "./candy-peak/PaytableModal";
import { GameMenuModal } from "./candy-peak/GameMenuModal";
import { WinLedger, mergeLedgerRows, type LedgerRow } from "./candy-peak/WinLedger";
import { ReelCell, type ReelPhase } from "./candy-peak/ReelCell";
import { getCandyPeakEngineConfigFn } from "@/functions/superadmin";
import { CANDY_PEAK_GAME_ID } from "@/lib/candy-peak-config";

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
const SLOT_INDICES = Object.freeze(Array.from({ length: CELLS }, (_, i) => i));

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
  if (typeof Image === "undefined") return;
  const urls = [
    "/images/symbols/sweet/backdrop.webp",
    "/images/symbols/sweet/lollipop.png",
    ...Object.values(ICON_SRC),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function CandyPeakSlot({
  gameId = "candy-peak",
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
  const [muted, setMuted] = useState(() => sounds.isMuted);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = +(bet * getBuyFeatureMult()).toFixed(2);
  const superBuyCost = +(bet * getSuperBuyFeatureMult()).toFixed(2);
  const activeBuyCost = buyMode === "super" ? superBuyCost : buyCost;

  const busyRef = useRef(false);
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

  /** Abortable wait — respects turbo + playback generation / unmount. */
  const wait = useCallback((ms: number, gen: number) => {
    const scaled = turboRef.current ? Math.round(ms * 0.45) : ms;
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
    sounds.preload();
    if (gameId === CANDY_PEAK_GAME_ID || gameId === "candy-peak") {
      void getCandyPeakEngineConfigFn()
        .then((cfg) => {
          if (mountedRef.current) setCandyPeakConfig(cfg);
        })
        .catch(() => {
          /* keep defaults */
        });
      void getCandyPeakSessionFn()
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
      sounds.stopSpinLoop();
    };
  }, [clearTrackedTimers, gameId]);

  /** Pull latest Superadmin math for local UI (server settle uses its own copy). */
  const refreshEngineConfig = useCallback(async () => {
    if (gameId !== CANDY_PEAK_GAME_ID && gameId !== "candy-peak") return;
    try {
      const cfg = await getCandyPeakEngineConfigFn();
      if (mountedRef.current) setCandyPeakConfig(cfg);
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
    async (script: SpinScript, isFree: boolean, gen: number) => {
      if (!isFree) {
        setLedger([]);
      }
      setDropTotal(0);
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      setFallDistance(EMPTY_FALL);

      setPhase("dropping");
      setSlots(asSlots(script.initialBoard));
      sounds.playSpin();
      await wait(
        ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow,
        gen,
      );
      sounds.stopSpinLoop();

      let running = 0;
      const rows: LedgerRow[] = [];

      for (const step of script.steps) {
        if (gen !== playbackGen.current) break;

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
        setDropTotal(running);
        if (isFree && running > 0) {
          setLastWin(+(fsSessionRef.current + running).toFixed(2));
        }

        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
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
    [wait],
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
      } else {
        setLastWin(0);
      }

      if (session.inFree && session.freeSpinsLeft > 0) {
        sounds.playFreeSpinsTrigger();
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
    [applySession, schedule, showTotalWin],
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
      setBanner(null);
      setWinPopup(null);

      try {
        await refreshEngineConfig();

        let settled: Awaited<ReturnType<typeof candyPeakSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired — refresh and try again");
            setAutoSpin(false);
            return;
          }
          settled = await candyPeakFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await candyPeakSpinFn({ data: { bet, ante } });
          setLedger([]);
          setDropTotal(0);
        }

        setBalanceLocal(settled.balance);
        void refreshJackpot();
        applySession(settled.session);

        const script = await playScript(settled.script, isFree, gen);
        if (gen !== playbackGen.current || !mountedRef.current) return;

        if (isFree) {
          setFsSessionWin(settled.session.fsSessionWin);
          setFsBombAcc(settled.session.fsBombAcc);
          setLastWin(settled.session.fsSessionWin || settled.fsPayout?.amount || 0);
          fsSessionRef.current = settled.session.fsSessionWin;
          fsBombRef.current = settled.session.fsBombAcc;
          fsSpinsPlayedRef.current = settled.session.fsSpinsPlayed;

          if (script.retriggerSpins > 0 && settled.session.inFree) {
            sounds.playFreeSpinsRetrigger();
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
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("[CandyPeak] spin failed", err);
          toast.error(err instanceof Error ? err.message : "Spin failed — try again");
          setAutoSpin(false);
        }
      } finally {
        if (gen === playbackGen.current) {
          busyRef.current = false;
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
      const bought = await candyPeakBuyFeatureFn({
        data: { bet, mode: buyMode },
      });
      setBalanceLocal(bought.balance);
      void refreshJackpot();
      applySession(bought.session);
      if (buyMode === "super") setAnte(true);
      setTriggerModalCount(bought.session.freeSpinsLeft || getFreeSpinsBase());
      sounds.playFreeSpinsTrigger();
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
    sounds.playFreeSpinsTrigger();
    schedule(() => setBanner(null), 1400);

    const gen = ++playbackGen.current;
    busyRef.current = true;
    try {
      const seeded = buildBoard(true, true, false);
      // Fisher–Yates for scatter seed positions (unbiased vs sort-shuffle).
      const indices = SLOT_INDICES.slice() as number[];
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
      if (busy || inFree) return;
      const i = betIndex(bet);
      const next = BET_STEPS[i + dir];
      if (next != null) setBet(next);
    },
    [bet, busy, inFree],
  );

  // Auto / free-spin chain — always invoke latest spin via ref (no stale closures).
  useEffect(() => {
    if (busyRef.current || busy) return;
    if (winPopup || fsSummary || buyOpen || menuOpen || infoOpen) return;
    if (inFree && freeSpins > 0) {
      const t = setTimeout(() => {
        void spinRef.current(true);
      }, turbo ? 350 : 700);
      return () => clearTimeout(t);
    }
    if (autoSpin && !inFree) {
      const t = setTimeout(() => {
        void spinRef.current(false);
      }, turbo ? 350 : 700);
      return () => clearTimeout(t);
    }
  }, [
    autoSpin,
    inFree,
    freeSpins,
    busy,
    turbo,
    winPopup,
    fsSummary,
    buyOpen,
    menuOpen,
    infoOpen,
  ]);

  const setMutedState = useCallback((on: boolean) => {
    sounds.setMuted(on);
    setMuted(on);
  }, []);

  const toggleMute = useCallback(() => setMutedState(!muted), [muted, setMutedState]);

  const displayWin = inFree ? fsSessionWin : lastWin;
  const showTumbleBadge =
    dropTotal > 0 &&
    (phase === "glow" || phase === "popping" || phase === "falling");

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none">
      <img
        src="/images/symbols/sweet/backdrop.webp"
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />

      {/* Centered playfield — large stage, equal side rails keep reels centered */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1600px] flex-col items-center gap-1.5 sm:gap-2">
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-2 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
            {/* LEFT RAIL */}
            <div className="hidden h-full min-w-0 items-center justify-end sm:flex">
              <div className="flex w-full flex-col items-stretch justify-center gap-2.5">
                {inFree ? (
                  <>
                    <CandyFeatureBadge
                      variant="multiplier"
                      value={`${fsBombAcc}x`}
                      className="w-full"
                    />
                    <div
                      className="w-full rounded-[1.2rem] p-[4px] shadow-[0_10px_28px_rgba(212,160,23,0.4)]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 18%,#D4A017 48%,#B8860B 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{
                          background: "linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)",
                        }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Total Win
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          {formatMoney(fsSessionWin)}
                        </div>
                      </div>
                    </div>
                    <FreeSpinsBadge count={freeSpins} className="w-full" />
                  </>
                ) : (
                  <CandyPeakSidePanel
                    buyCost={buyCost}
                    superBuyCost={superBuyCost}
                    totalBet={totalBet}
                    ante={ante}
                    busy={busy}
                    onBuy={() => openBuyFeature("normal")}
                    onBuySuper={() => openBuyFeature("super")}
                    onAnteChange={setAnte}
                  />
                )}
                <WinLedger rows={ledger} total={dropTotal} />
              </div>
            </div>

            {/* GRID COLUMN */}
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 w-full max-w-full flex-col items-center"
                style={{
                  width: `min(100%, calc(82dvh * ${COLS} / ${ROWS}))`,
                }}
              >
                <div
                  className="mb-1.5 flex shrink-0 items-center gap-2 rounded-full px-4 py-1 shadow-[0_8px_22px_rgba(212,160,23,0.45)] sm:px-5"
                  style={{
                    background:
                      "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 25%,#D4A017 70%,#B8860B 100%)",
                    border: "2px solid #5B21B6",
                  }}
                >
                  <span
                    className="text-sm font-black tracking-wide sm:text-base"
                    style={{
                      color: "#3B0764",
                      textShadow: "0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    4X
                  </span>
                  <img
                    src="/images/symbols/sweet/lollipop.png"
                    alt=""
                    className="size-7 object-contain drop-shadow sm:size-8"
                    decoding="async"
                  />
                  <span
                    className="text-sm font-black uppercase tracking-wide sm:text-base"
                    style={{
                      color: "#3B0764",
                      textShadow: "0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    Wins Free Spins
                  </span>
                </div>

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
                          className="rounded-full border-2 border-yellow-300 px-4 py-1.5 text-center shadow-[0_0_20px_rgba(250,204,21,0.65)]"
                          style={{
                            background:
                              "linear-gradient(180deg, #a855f7 0%, #7e22ce 55%, #581c87 100%)",
                          }}
                        >
                          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white">
                            Tumble Win
                          </div>
                          <div className="text-lg font-black leading-none text-yellow-300 tabular-nums">
                            {formatMoney(dropTotal)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Candy-cane frame */}
                    <div
                      className="relative size-full rounded-[1rem] p-[7px] shadow-[0_18px_50px_rgba(91,33,182,0.45)] sm:rounded-[1.25rem] sm:p-[9px]"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg, #fff 0 10px, #fda4af 10px 20px, #fb7185 20px 30px, #fff 30px 40px)",
                      }}
                    >
                      <div
                        className="relative size-full overflow-hidden rounded-[0.65rem] sm:rounded-[0.9rem]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255,228,240,0.28) 0%, rgba(251,113,133,0.14) 50%, rgba(255,255,255,0.1) 100%)",
                        }}
                      >
                        <div
                          className="grid size-full"
                          style={{
                            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                          }}
                        >
                          {SLOT_INDICES.map((i) => {
                            const cell = slots[i] ?? null;
                            const win = cell ? winningKeys.has(cell.key) : false;
                            return (
                              <ReelCell
                                key={`slot-${i}`}
                                index={i}
                                cell={cell}
                                phase={phase}
                                win={win}
                                perPay={cell ? payoutByKey.get(cell.key) : undefined}
                                isSpawn={cell ? spawnedKeys.has(cell.key) : false}
                                isFallen={cell ? fallenKeys.has(cell.key) : false}
                                fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
                                cols={COLS}
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
                      className="rounded-lg border-2 border-[#E8C547] bg-[#7C3AED] px-3 py-1.5 text-[10px] font-black uppercase text-white"
                    >
                      Buy FS {formatMoneyCompact(buyCost)}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openBuyFeature("super")}
                      className="rounded-lg border-2 border-[#E8C547] bg-[#5B21B6] px-3 py-1.5 text-[10px] font-black uppercase text-white"
                    >
                      Super {formatMoneyCompact(superBuyCost)}
                    </button>
                  </div>
                )}

                {/* BOTTOM BAR */}
                <div
                  className="mt-2 w-full shrink-0 rounded-[1.15rem] p-[4px] shadow-[0_12px_36px_rgba(46,16,101,0.55)]"
                  style={{
                    background:
                      "repeating-linear-gradient(135deg, #FFF3B0 0 8px, #F5D76E 8px 16px, #D4A017 16px 24px, #FFF3B0 24px 32px)",
                  }}
                >
                  <div
                    className="flex flex-col gap-2 rounded-[0.95rem] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(109,40,217,0.96) 0%, rgba(59,7,100,0.97) 100%)",
                    }}
                  >
                    <div className="flex min-w-0 flex-col gap-1.5 sm:min-w-[150px]">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-black tracking-wide sm:gap-x-4">
                        <div>
                          <span className="text-[10px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Credit{" "}
                          </span>
                          <span className="text-sm tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(balance)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Bet{" "}
                          </span>
                          <span className="text-sm tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(totalBet)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Win{" "}
                          </span>
                          <span className="text-sm tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(displayWin)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMenuOpen(true)}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#3B0764] text-[#F5D76E] shadow transition hover:brightness-110"
                          aria-label="Menu"
                        >
                          <Menu size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInfoOpen(true)}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#3B0764] text-[#F5D76E] shadow transition hover:brightness-110"
                          aria-label="Paytable"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={toggleMute}
                          className={cn(
                            "grid size-8 place-items-center rounded-full border-2 shadow transition hover:brightness-110",
                            muted
                              ? "border-white/40 bg-black/30 text-white/70"
                              : "border-[#E8C547]/70 bg-[#3B0764] text-[#F5D76E]",
                          )}
                          aria-label={muted ? "Unmute" : "Mute"}
                        >
                          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTurbo((v) => !v)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow transition sm:text-xs",
                          turbo
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#3B0764]"
                            : "border-[#E8C547]/80 bg-[#3B0764] text-[#F5D76E]",
                        )}
                        aria-pressed={turbo}
                      >
                        <Zap size={12} />
                        Turbo
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        className="hidden items-center rounded-full border-2 border-[#E8C547]/80 bg-[#3B0764] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#F5D76E] shadow transition hover:brightness-110 sm:inline-flex sm:text-xs"
                      >
                        Paytable
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1 self-center">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-10 place-items-center rounded-full border-[3px] border-[#E8C547] text-xl font-black text-white shadow-lg disabled:opacity-40 sm:size-11"
                          style={{
                            background: "linear-gradient(180deg,#6D28D9 0%,#3B0764 100%)",
                          }}
                          aria-label="Decrease bet"
                        >
                          −
                        </button>

                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => void spin(false)}
                          className="relative grid size-[68px] place-items-center rounded-full border-[4px] border-[#E8C547] shadow-[0_8px_28px_rgba(212,160,23,0.45)] disabled:opacity-60 sm:size-[76px]"
                          style={{
                            background:
                              "radial-gradient(circle at 35% 28%, #A855F7 0%, #5B21B6 42%, #1e0a3c 100%)",
                          }}
                          aria-label="Spin"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="size-8 text-[#F5D76E] sm:size-9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                          >
                            <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
                            <path
                              d="M21 3v6h-6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => nudgeBet(1)}
                          className="grid size-10 place-items-center rounded-full border-[3px] border-[#E8C547] text-xl font-black text-white shadow-lg disabled:opacity-40 sm:size-11"
                          style={{
                            background: "linear-gradient(180deg,#6D28D9 0%,#3B0764 100%)",
                          }}
                          aria-label="Increase bet"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={inFree}
                        onClick={() => setAutoSpin((v) => !v)}
                        className={cn(
                          "rounded-full border-2 px-5 py-1 text-[10px] font-black uppercase tracking-wider shadow sm:text-xs",
                          autoSpin
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#3B0764]"
                            : "border-[#E8C547]/80 bg-[#3B0764] text-[#F5D76E]",
                        )}
                      >
                        Autoplay
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
        {infoOpen && (
          <PaytableModal bet={totalBet} onClose={() => setInfoOpen(false)} />
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
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-[2px]"
          >
            <div className="rounded-2xl border-4 border-white bg-gradient-to-b from-yellow-300 to-pink-500 px-10 py-5 text-center shadow-2xl">
              <div className="text-3xl font-black text-white drop-shadow-lg md:text-4xl">
                {banner}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
