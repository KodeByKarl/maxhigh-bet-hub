import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FastForward, Info, RotateCcw, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { chineseAudio } from "./chinese-new-year/audio";
import {
  chineseNewYearBuyFeatureFn,
  chineseNewYearFreeSpinFn,
  chineseNewYearSpinFn,
  getChineseNewYearSessionFn,
} from "@/functions/api";
import { ANIM } from "./chinese-new-year/animationConfig";
import { initialBoard, nextKey, buildBoard } from "./chinese-new-year/gridState";
import {
  BET_STEPS,
  ICON_SRC,
  getAnteMult,
  getBuyFeatureMult,
  getFreeSpinsBase,
  getSuperBuyFeatureMult,
} from "./chinese-new-year/paytable";
import { getRuntimeSymbols, setChineseNewYearConfig } from "./chinese-new-year/runtimeConfig";
import type { BoardCell, SpinScript } from "./chinese-new-year/types";
import { CELLS, COLS, MAIN_CELLS, ROWS, TOP_COLS } from "./chinese-new-year/types";
import { WinCelebration } from "./chinese-new-year/WinCelebration";
import { ReelCell, type ReelPhase } from "./chinese-new-year/ReelCell";
import { PaytableModal } from "./chinese-new-year/PaytableModal";
import { getChineseNewYearEngineConfigFn } from "@/functions/superadmin";
import { CHINESE_NEW_YEAR_GAME_ID } from "@/lib/chinese-new-year-config";

type Phase = ReelPhase;
type Slot = BoardCell | null;
type WinPopup = {
  amount: number;
  baseEarn?: number | null;
  multiplier?: number | null;
};

const EMPTY_SET = new Set<string>();
const EMPTY_PAY = new Map<string, number>();
const EMPTY_FALL: Record<string, number> = Object.freeze({}) as Record<string, number>;
const TOP_INDICES = Object.freeze([0, 1, 2, 3]);
const MAIN_INDICES = Object.freeze(Array.from({ length: MAIN_CELLS }, (_, i) => i + TOP_COLS));
const ALL_BOARD_INDICES = Object.freeze(Array.from({ length: CELLS }, (_, i) => i));

function scatterSym() {
  return getRuntimeSymbols().find((s) => s.scatter)!;
}

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

export function ChineseNewYearSlot({
  gameId = "chinese-new-year",
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
  const [dropTotal, setDropTotal] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<WinPopup | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const busy = phase !== "idle";
  const totalBet = +(bet * (ante ? getAnteMult() : 1)).toFixed(2);
  const buyCost = +(bet * getBuyFeatureMult()).toFixed(2);
  const superBuyCost = +(bet * getSuperBuyFeatureMult()).toFixed(2);

  const busyRef = useRef(false);
  const skipRef = useRef(false);
  const turboRef = useRef(turbo);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const freeSpinsRef = useRef(freeSpins);
  const fsSessionRef = useRef(fsSessionWin);
  const fsBombRef = useRef(fsBombAcc);
  const spinRef = useRef<(asFree?: boolean) => Promise<void>>(async () => undefined);

  turboRef.current = turbo;
  freeSpinsRef.current = freeSpins;
  fsSessionRef.current = fsSessionWin;
  fsBombRef.current = fsBombAcc;

  const wait = useCallback((ms: number, gen: number) => {
    if (skipRef.current) return Promise.resolve();
    const scaled = turboRef.current ? Math.min(ms, 60) : ms;
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!mountedRef.current || gen !== playbackGen.current) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        resolve();
      }, scaled);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    chineseAudio.preload();
    void getChineseNewYearEngineConfigFn()
      .then((cfg) => {
        if (mountedRef.current) setChineseNewYearConfig(cfg);
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      chineseAudio.stopSpinLoop();
      chineseAudio.stopAmbient();
    };
  }, []);

  const playScript = useCallback(
    async (script: SpinScript, isFree: boolean, gen: number, startBalance: number) => {
      setDropTotal(0);
      setWinningKeys(EMPTY_SET);
      setPayoutByKey(EMPTY_PAY);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      let running = 0;
      let currentBal = startBalance;

      if (skipRef.current) {
        const lastStep = script.steps[script.steps.length - 1];
        const finalBoard = lastStep ? lastStep.afterFall : script.initialBoard;
        setSlots(asSlots(finalBoard));
        running = script.totalWin;
        currentBal = startBalance + script.totalWin;
        setBalanceLocal(currentBal);
        setDropTotal(running);
      } else {
        setPhase("dropping");
        setSlots(asSlots(script.initialBoard));
        chineseAudio.startSpinLoop();
        await wait(
          ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow,
          gen,
        );
        chineseAudio.stopSpinLoop();
        chineseAudio.playReelStop(5);
      }

      for (const step of script.steps) {
        if (gen !== playbackGen.current) break;

        if (skipRef.current) {
          const lastStep = script.steps[script.steps.length - 1];
          const finalBoard = lastStep ? lastStep.afterFall : script.initialBoard;
          setSlots(asSlots(finalBoard));
          running = script.totalWin;
          currentBal = startBalance + script.totalWin;
          setBalanceLocal(currentBal);
          setDropTotal(running);
          break;
        }

        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
        setSlots(asSlots(step.board));
        setWinningKeys(new Set(step.winningKeys));
        const payMap = new Map<string, number>();
        for (const c of step.clusters) {
          for (const k of c.keys) payMap.set(k, c.perSymbol);
        }
        setPayoutByKey(payMap);
        running += step.tumbleWin;
        if (step.tumbleWin > 0) {
          currentBal += step.tumbleWin;
          setBalanceLocal(currentBal);
        }
        setDropTotal(running);

        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
        chineseAudio.playCascadeTick();
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
      }
      return script;
    },
    [wait, setBalanceLocal],
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
        if (!isFree) setBalanceLocal(balance - cost);

        let settled: Awaited<ReturnType<typeof chineseNewYearSpinFn>>;
        if (isFree) {
          const sessionId = playSessionIdRef.current;
          if (!sessionId) {
            toast.error("Free spin session expired");
            return;
          }
          settled = await chineseNewYearFreeSpinFn({ data: { sessionId } });
        } else {
          settled = await chineseNewYearSpinFn({ data: { bet, ante } });
        }

        void refreshJackpot();
        const script = await playScript(settled.script, isFree, gen, isFree ? balance : balance - cost);
        if (gen !== playbackGen.current || !mountedRef.current) return;

        if (script.totalWin > 0) {
          setLastWin(script.totalWin);
          chineseAudio.playWin(script.totalWin, totalBet);
          if (script.totalWin / totalBet >= 8) {
            setWinPopup({
              amount: script.totalWin,
              baseEarn: script.rawWin,
              multiplier: script.displayMult,
            });
          }
        }
      } catch (err) {
        if (!isFree) setBalanceLocal(balance);
      } finally {
        if (gen === playbackGen.current) {
          busyRef.current = false;
          if (mountedRef.current) setPhase("idle");
        }
      }
    },
    [ante, balance, bet, playScript, refreshJackpot, setBalanceLocal, totalBet, inFree],
  );

  spinRef.current = spin;

  const nudgeBet = useCallback(
    (dir: -1 | 1) => {
      if (busy) return;
      const i = betIndex(bet);
      const next = BET_STEPS[i + dir];
      if (next != null) setBet(next);
    },
    [bet, busy],
  );

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none bg-[#120404]">
      {/* Traditional Chinese Pagoda & Dragon Frame Backdrop */}
      <div
        className="absolute inset-0 size-full bg-cover bg-center opacity-40 blur-[1px]"
        style={{
          backgroundImage: "radial-gradient(circle at center, #991b1b 0%, #450a0a 60%, #000 100%)",
        }}
      />

      {/* Playfield Container */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1200px] flex-col items-center gap-1.5 sm:gap-2">
          
          {/* Pagoda Header Banner */}
          <div className="flex shrink-0 items-center justify-between w-full max-w-[840px] px-4 py-1 rounded-t-2xl border-b-2 border-yellow-400 bg-gradient-to-r from-red-950 via-red-800 to-red-950 shadow-xl">
            <div className="flex items-center gap-2 text-yellow-300 font-black text-sm uppercase tracking-wider">
              <span>🧧</span>
              <span>CHINESE NEW YEAR</span>
              <span>🏮</span>
            </div>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-yellow-300 bg-red-900/80 px-2.5 py-1 rounded-full border border-yellow-400/40 hover:bg-red-800"
            >
              <Info size={14} /> Paytable
            </button>
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 w-full max-w-[840px] flex-col items-center justify-center"
                style={{ width: "min(100%, 800px)" }}
              >
                {/* 1ST LAYER: TOP 4 REEL TRACKER */}
                <div className="-mb-[2px] relative z-10 flex shrink-0 justify-center w-full">
                  <div
                    className="relative flex items-center justify-center rounded-t-2xl rounded-b-none p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                    style={{
                      width: "calc(100% * (4 / 6))",
                      background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
                      border: "2px solid #facc15",
                      borderBottom: "none",
                    }}
                  >
                    <div
                      className="grid size-full rounded-t-xl overflow-hidden bg-red-950/90"
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
                </div>

                {/* 2ND LAYER: MAIN 6x7 GRID */}
                <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                  <div
                    className="relative mx-auto size-full max-h-full"
                    style={{
                      aspectRatio: `${COLS} / ${ROWS}`,
                      width: "100%",
                      height: "auto",
                    }}
                  >
                    <div
                      className="relative size-full rounded-3xl p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
                      style={{
                        background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
                        border: "3px solid #facc15",
                      }}
                    >
                      <div
                        className="relative size-full overflow-hidden rounded-2xl bg-gradient-to-b from-red-950 to-black p-1"
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

                {/* BOTTOM CONTROL BAR */}
                <div className="mt-2 w-full shrink-0 max-w-[1100px] mx-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-red-950/90 p-2 backdrop-blur-md border-2 border-yellow-400 shadow-2xl">
                    
                    {/* LEFT SECTION */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        className="grid size-9 place-items-center rounded-full bg-red-900 text-yellow-300 border border-yellow-400/40 hover:bg-red-800 transition"
                      >
                        <Info size={18} />
                      </button>

                      <div className="flex items-center gap-1.5 bg-red-900/90 rounded-full px-3 py-1 border border-yellow-400/30">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-6 place-items-center rounded-full bg-red-800 text-yellow-300 font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="text-xs font-black tabular-nums text-yellow-300 px-1">
                          {totalBet.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => nudgeBet(1)}
                          className="grid size-6 place-items-center rounded-full bg-red-800 text-yellow-300 font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* CENTER SECTION */}
                    <div className="flex flex-1 items-center justify-center max-w-[450px]">
                      <div className="flex w-full items-center justify-between rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 p-1 font-black text-xs text-red-950 shadow-md">
                        <span className="px-3">Bet: ₱{totalBet.toFixed(2)}</span>
                        <span className="truncate px-2 text-red-900">
                          {dropTotal > 0 ? `Win ₱${dropTotal.toFixed(2)}` : "Gong Xi Fa Cai!"}
                        </span>
                        <span className="px-3">Bal: ₱{balance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* RIGHT SECTION */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTurbo((v) => !v)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full border transition",
                          turbo
                            ? "border-yellow-300 bg-yellow-400/30 text-yellow-300"
                            : "border-white/20 bg-red-900 text-white/70"
                        )}
                      >
                        <FastForward size={18} />
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void spin(false)}
                        className="relative grid size-14 place-items-center rounded-full border-2 border-yellow-300 bg-gradient-to-b from-yellow-400 via-red-600 to-red-900 text-yellow-200 shadow-lg active:scale-95 hover:brightness-110"
                      >
                        <RotateCw size={24} className={cn(busy && "animate-spin")} />
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {infoOpen && (
          <PaytableModal bet={totalBet} onClose={() => setInfoOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winPopup && (
          <WinCelebration
            amount={winPopup.amount}
            bet={bet}
            baseEarn={winPopup.baseEarn}
            multiplier={winPopup.multiplier}
            onDismiss={() => setWinPopup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
