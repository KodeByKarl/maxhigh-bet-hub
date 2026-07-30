import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { BoardCell, SpinScript } from "./mahjong-ways/types";
import type { MahjongSymKind } from "@/lib/mahjong-ways-config";
import { DEFAULT_MAHJONG_WAYS_CONFIG } from "@/lib/mahjong-ways-config";
import {
  getMahjongWaysSessionFn,
  mahjongWaysBuyFeatureFn,
  mahjongWaysFreeSpinFn,
  mahjongWaysSpinFn,
} from "@/functions/api";

type MahjongWaysSlotProps = {
  onBalanceUpdate?: () => void;
};

// High-definition 3D Mahjong tile graphics map
const TILE_IMAGE_MAP: Record<MahjongSymKind, string> = {
  sym_10: "/images/symbols/mahjong/10.png",
  sym_j: "/images/symbols/mahjong/j.png",
  sym_q: "/images/symbols/mahjong/q.png",
  sym_k: "/images/symbols/mahjong/k.png",
  sym_a: "/images/symbols/mahjong/a.png",
  bamboo: "/images/symbols/mahjong/bamboo.png",
  character: "/images/symbols/mahjong/character.png",
  dot: "/images/symbols/mahjong/dot.png",
  red_dragon: "/images/symbols/mahjong/red_dragon.png",
  green_dragon: "/images/symbols/mahjong/green_dragon.png",
  wild: "/images/symbols/mahjong/wild.png",
  scatter: "/images/symbols/mahjong/scatter.png",
};

// Initial board helper so 3D tiles/cards are immediately visible on load
function createInitialBoard(): BoardCell[] {
  const reelHeights = [4, 4, 4, 4, 4];
  const symbols = DEFAULT_MAHJONG_WAYS_CONFIG.symbols;
  const board: BoardCell[] = [];
  let keyCounter = 1;

  for (let r = 0; r < 5; r++) {
    const height = reelHeights[r];
    for (let row = 0; row < height; row++) {
      const symIndex = (r * 3 + row * 2) % (symbols.length - 2);
      const sym = symbols[symIndex];
      const isGold = r >= 1 && r <= 3 && (r + row) % 3 === 0 && !sym.wild && !sym.scatter;
      board.push({
        key: `init_${r}_${row}_${keyCounter++}`,
        sym,
        reelIndex: r,
        rowIndex: row,
        isGold,
      });
    }
  }

  return board;
}

// 3D Mahjong Tile Symbol Renderer matching authentic carved 3D Mahjong bone blocks on green felt
function renderTileSymbol(cell: BoardCell) {
  const { kind, name } = cell.sym;
  const isGoldTile = cell.isGold;

  // 1. SCATTER TILE
  if (cell.sym.scatter) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full rounded-2xl bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 shadow-[0_5px_0_#78350f,0_8px_15px_rgba(245,158,11,0.6)] border-2 border-yellow-100 select-none overflow-hidden p-1 animate-pulse">
        <span className="absolute top-0.5 right-0.5 z-20 bg-yellow-950 text-amber-200 text-[8px] font-black px-1 rounded shadow">
          SCATTER
        </span>
        <div className="flex flex-col items-center justify-center">
          <span className="text-3xl sm:text-4xl font-black text-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">胡</span>
          <span className="text-[10px] font-black text-amber-950 tracking-wider">SCATTER</span>
        </div>
      </div>
    );
  }

  // 2. WILD TILE
  if (cell.sym.wild) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full rounded-2xl bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600 shadow-[0_5px_0_#78350f,0_8px_15px_rgba(245,158,11,0.6)] border-2 border-amber-100 select-none overflow-hidden p-1">
        <span className="absolute top-0.5 right-0.5 z-20 bg-amber-950 text-yellow-200 text-[8px] font-black px-1 rounded shadow">
          WILD
        </span>
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl">🪷</span>
          <span className="text-xs font-black text-amber-950 tracking-widest uppercase">WILD</span>
        </div>
      </div>
    );
  }

  // Helper for carved symbol faces on bone block
  const renderSymbolFace = () => {
    switch (kind) {
      case "green_dragon":
        return (
          <span className="text-3xl sm:text-4xl font-black text-emerald-600 drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]">
            發
          </span>
        );
      case "red_dragon":
        return (
          <span className="text-3xl sm:text-4xl font-black text-rose-600 drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]">
            中
          </span>
        );
      case "character":
        return (
          <div className="flex flex-col items-center leading-none font-black text-indigo-700 drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]">
            <span className="text-lg sm:text-xl text-purple-700">八</span>
            <span className="text-base sm:text-lg text-rose-600">萬</span>
          </div>
        );
      case "bamboo":
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex gap-1 text-emerald-600 text-xs font-black">
              <span>🎋</span><span>🎋</span>
            </div>
            <span className="text-[9px] font-extrabold text-emerald-800 tracking-wider">五條</span>
          </div>
        );
      case "dot":
        return (
          <div className="grid grid-cols-2 gap-1 items-center justify-center p-1">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-sm" />
            <span className="w-3.5 h-3.5 col-span-2 mx-auto bg-rose-600 border border-white shadow-sm rounded-full" />
          </div>
        );
      case "sym_a":
        return <span className="text-2xl sm:text-3xl font-black text-rose-600 drop-shadow">A</span>;
      case "sym_k":
        return <span className="text-2xl sm:text-3xl font-black text-amber-600 drop-shadow">K</span>;
      case "sym_q":
        return <span className="text-2xl sm:text-3xl font-black text-purple-600 drop-shadow">Q</span>;
      case "sym_j":
        return <span className="text-2xl sm:text-3xl font-black text-blue-600 drop-shadow">J</span>;
      case "sym_10":
      default:
        return <span className="text-2xl sm:text-3xl font-black text-emerald-600 drop-shadow">10</span>;
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center w-full h-full rounded-2xl p-1 select-none transition-transform hover:scale-105 overflow-hidden ${
        isGoldTile
          ? "bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 border-2 border-yellow-200 shadow-[0_5px_0_#78350f,0_8px_12px_rgba(245,158,11,0.5)]"
          : "bg-gradient-to-b from-[#fefefe] via-[#f8fafc] to-[#e2e8f0] border border-slate-200 shadow-[0_5px_0_#14532d,0_8px_12px_rgba(0,0,0,0.4)]"
      }`}
    >
      {isGoldTile && (
        <span className="absolute top-0.5 right-0.5 z-20 text-[8px] font-black bg-amber-700 text-yellow-100 px-1 rounded shadow-md border border-yellow-200">
          GOLD
        </span>
      )}

      {/* Clean 3D Mahjong bone face */}
      <div className="w-full h-full rounded-xl bg-gradient-to-b from-white/95 to-slate-100/95 border border-slate-200/80 flex items-center justify-center shadow-inner p-1">
        {renderSymbolFace()}
      </div>
    </div>
  );
}

export function MahjongWaysSlot({ onBalanceUpdate }: MahjongWaysSlotProps) {
  const [bet, setBet] = useState<number>(5.0);
  const [ante, setAnte] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Session & free spin state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0);
  const [fsSessionWin, setFsSessionWin] = useState<number>(0);
  const [inFree, setInFree] = useState<boolean>(false);

  // Reel & cascade render state (initial board populated with 3D tiles)
  const [reelHeights, setReelHeights] = useState<number[]>([4, 4, 4, 4, 4]);
  const [board, setBoard] = useState<BoardCell[]>(() => createInitialBoard());
  const [winningKeys, setWinningKeys] = useState<Set<string>>(new Set());
  const [currentMult, setCurrentMult] = useState<number>(1);
  const [totalWays, setTotalWays] = useState<number>(1024);
  const [lastWin, setLastWin] = useState<number>(0);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);

  // Rehydrate open session on mount
  useEffect(() => {
    getMahjongWaysSessionFn()
      .then((sess) => {
        if (sess && sess.inFree) {
          setSessionId(sess.sessionId);
          setFreeSpinsLeft(sess.freeSpinsLeft);
          setFsSessionWin(sess.fsSessionWin);
          setInFree(true);
          toast.info(`Resuming Free Spins session (${sess.freeSpinsLeft} spins left)`);
        }
      })
      .catch(() => {});
  }, []);

  const multList = inFree ? [2, 4, 6, 10] : [1, 2, 3, 5];

  // Helper to play script cascade steps with smooth column tumble animation
  const animateScript = useCallback(
    async (script: SpinScript) => {
      setReelHeights(script.initialReelHeights);
      setTotalWays(script.totalWays);

      // 1. Reel Spin Tumble Phase: generate staggered dropping board
      for (let spinFrame = 0; spinFrame < 2; spinFrame++) {
        setBoard(createInitialBoard());
        await new Promise((r) => setTimeout(r, 180));
      }

      // 2. Land Initial Spin Board
      setBoard(script.initialBoard);
      await new Promise((r) => setTimeout(r, 350)); // Initial land pause

      // 3. Process Tumble Cascade Steps
      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];
        setBoard(step.board);
        setCurrentMult(step.multiplier);

        if (step.evalResult.winningKeys.size > 0) {
          // Highlight winning tiles
          setWinningKeys(step.evalResult.winningKeys);
          await new Promise((r) => setTimeout(r, 650));

          // Pop winning tiles and allow tumble gravity drop
          setWinningKeys(new Set());
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setLastWin(script.totalWin);
      if (onBalanceUpdate) onBalanceUpdate();
    },
    [onBalanceUpdate],
  );

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinningKeys(new Set());
    setLastWin(0);

    try {
      if (inFree && sessionId) {
        // Free Spin Step
        const res = await mahjongWaysFreeSpinFn({ data: { sessionId } });
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(res.session.fsSessionWin);
        setInFree(res.session.inFree);

        await animateScript(res.script);

        if (res.fsPayout) {
          toast.success(`🎉 Free Spins Complete! Total Won: ₱${res.fsPayout.amount.toFixed(2)}`, {
            duration: 6000,
          });
        }
      } else {
        // Regular Paid Spin
        const res = await mahjongWaysSpinFn({ data: { bet, ante } });
        if (res.session.inFree) {
          setSessionId(res.session.sessionId);
          setFreeSpinsLeft(res.session.freeSpinsLeft);
          setFsSessionWin(0);
          setInFree(true);
          toast.success(`🔥 SCATTER TRIGGERED! Awarded ${res.session.freeSpinsLeft} Free Spins!`);
        }
        await animateScript(res.script);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Spin failed";
      toast.error(msg);
      setAutoSpinsLeft(0);
    } finally {
      setIsSpinning(false);
    }
  };

  const handleBuyFeature = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowBuyModal(false);

    try {
      const res = await mahjongWaysBuyFeatureFn({ data: { bet } });
      if (res.session.inFree) {
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(0);
        setInFree(true);
      }
      await animateScript(res.script);
      toast.success(`🚀 Feature Buy Activated! ${res.session.freeSpinsLeft} Free Spins Awarded!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Buy Feature failed";
      toast.error(msg);
    } finally {
      setIsSpinning(false);
    }
  };

  // Auto spin trigger loop
  useEffect(() => {
    if (autoSpinsLeft > 0 && !isSpinning) {
      const timer = setTimeout(() => {
        setAutoSpinsLeft((prev) => prev - 1);
        handleSpin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoSpinsLeft, isSpinning]);

  return (
    <div className="relative w-full max-w-2xl h-full max-h-[98dvh] mx-auto flex flex-col justify-between items-center bg-[#450a0a] rounded-3xl border-4 border-[#b45309] shadow-2xl overflow-hidden font-sans select-none">
      {/* Wooden Top Header Banner */}
      <div className="w-full shrink-0 bg-gradient-to-b from-[#7f1d1d] via-[#991b1b] to-[#450a0a] border-b-2 border-[#b45309] px-4 py-2 flex flex-col items-center justify-center shadow-lg relative">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-amber-200 tracking-wider">Mahjong Ways</span>
          <span className="text-xs font-black text-amber-300 tracking-widest uppercase">{totalWays} WAYS</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-black/40 text-amber-300 hover:bg-black/60 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Multipliers Progression Bar */}
        <div className="flex items-center justify-center gap-6 mt-1">
          {multList.map((m, idx) => {
            const isActive = currentMult === m;
            return (
              <span
                key={idx}
                className={`text-xl sm:text-2xl font-black transition-all duration-300 ${
                  isActive
                    ? "text-yellow-300 scale-125 drop-shadow-[0_2px_10px_rgba(250,204,21,0.9)] italic"
                    : "text-amber-700/70"
                }`}
              >
                x{m}
              </span>
            );
          })}
        </div>
      </div>

      {/* Free Spins Active Banner */}
      {inFree && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full shrink-0 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-yellow-950 p-1 text-center font-black text-xs shadow flex items-center justify-between px-4 border-y border-yellow-200"
        >
          <span>🔥 FREE SPINS ACTIVE</span>
          <span className="bg-yellow-950 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {freeSpinsLeft} SPINS LEFT
          </span>
          <span>WIN: ₱{fsSessionWin.toFixed(2)}</span>
        </motion.div>
      )}

      {/* 5-Reel Casino Green Felt Table Grid — Fits strictly inside Viewport */}
      <div className="w-full flex-1 min-h-0 bg-gradient-to-b from-[#14532d] via-[#15803d] to-[#14532d] p-2 sm:p-3 overflow-hidden flex items-center justify-center relative">
        {/* Subtle Felt Fabric Glow & Coins */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full h-full grid grid-cols-5 gap-1.5 sm:gap-2 items-center justify-center relative z-10">
          {Array.from({ length: 5 }).map((_, rIdx) => {
            const height = reelHeights[rIdx] || 4;
            const reelCells = board.filter((c) => c.reelIndex === rIdx);

            return (
              <div key={rIdx} className="flex flex-col gap-1.5 sm:gap-2 justify-center h-full max-h-full overflow-hidden">
                {Array.from({ length: height }).map((_, rowIdx) => {
                  const cell = reelCells.find((c) => c.rowIndex === rowIdx);
                  const isWinning = cell ? winningKeys.has(cell.key) : false;

                  return (
                    <div
                      key={cell?.key || `empty_${rIdx}_${rowIdx}`}
                      className="relative w-full flex-1 max-h-[16dvh] aspect-square flex items-center justify-center mx-auto"
                    >
                      <AnimatePresence mode="popLayout">
                        {cell ? (
                          <motion.div
                            key={cell.key}
                            initial={{ y: -60, opacity: 0 }}
                            animate={{
                              y: 0,
                              opacity: 1,
                              scale: isWinning ? [1, 1.15, 0.95, 1] : 1,
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              duration: 0.35,
                              ease: "easeOut",
                              delay: rIdx * 0.05,
                            }}
                            className={`w-full h-full ${
                              isWinning ? "ring-4 ring-yellow-400 ring-offset-1 ring-offset-[#14532d] z-20 rounded-2xl" : ""
                            }`}
                          >
                            {renderTileSymbol(cell)}
                          </motion.div>
                        ) : (
                          <div className="w-full h-full rounded-2xl bg-[#14532d]/40 border border-[#15803d]/40" />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Display Bar */}
      <div className="w-full shrink-0 bg-[#292524] border-t-2 border-[#b45309] px-4 py-1.5 flex items-center justify-center h-10 shadow-inner">
        {lastWin > 0 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center font-black text-lg sm:text-xl text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]"
          >
            WIN ₱{lastWin.toFixed(2)}
          </motion.div>
        ) : (
          <div className="text-xs text-amber-400/60 font-semibold tracking-wider uppercase">Good Luck!</div>
        )}
      </div>

      {/* Wooden Bottom Control Panel */}
      <div className="w-full shrink-0 bg-gradient-to-b from-[#450a0a] via-[#292524] to-[#1c1917] border-t-2 border-[#b45309] p-2 sm:p-3 flex flex-col gap-2">
        {/* Balance & Bet Information strip */}
        <div className="grid grid-cols-3 gap-2 text-center bg-black/50 rounded-xl p-1.5 border border-amber-900/40 text-xs">
          <div>
            <span className="text-[10px] text-amber-400/70 block uppercase font-bold">Balance</span>
            <span className="font-extrabold text-cyan-300">₱{fsSessionWin > 0 ? fsSessionWin.toFixed(2) : "1,000.00"}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-400/70 block uppercase font-bold">Bet</span>
            <span className="font-black text-amber-300">₱{(bet * (ante ? 1.25 : 1)).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-400/70 block uppercase font-bold">Win</span>
            <span className="font-extrabold text-emerald-400">₱{lastWin.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Controls & Big Spin Button */}
        <div className="flex items-center justify-between gap-2 px-1">
          {/* Left Buttons: Ante & Buy Feature */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAnte(!ante)}
              disabled={isSpinning || inFree}
              className={`p-2 rounded-xl text-[10px] font-bold border transition ${
                ante
                  ? "bg-amber-500 text-yellow-950 border-yellow-200 shadow"
                  : "bg-stone-800 text-amber-200 border-stone-700 hover:bg-stone-700"
              } disabled:opacity-50`}
            >
              ANTE {ante ? "+25%" : "OFF"}
            </button>

            <button
              onClick={() => setShowBuyModal(true)}
              disabled={isSpinning || inFree}
              className="p-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-amber-500 to-yellow-600 text-yellow-950 border border-yellow-200 hover:brightness-110 transition shadow flex items-center gap-1 disabled:opacity-50"
            >
              <Zap className="w-3 h-3 fill-current" /> BUY
            </button>
          </div>

          {/* Center: Circular Golden Spin Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-4 border-yellow-200 shadow-[0_4px_15px_rgba(245,158,11,0.7)] flex items-center justify-center text-amber-950 font-black text-lg hover:brightness-110 active:scale-95 transition disabled:opacity-60 shrink-0"
          >
            {isSpinning ? (
              <RotateCcw className="w-7 h-7 animate-spin text-amber-950" />
            ) : (
              <span className="text-xl sm:text-2xl">🀄</span>
            )}
          </button>

          {/* Right Buttons: Bet Adjustment & Auto Spin */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-stone-800 rounded-xl border border-stone-700 p-0.5">
              <button
                onClick={() => setBet((b) => Math.max(1.0, +(b - 1.0).toFixed(2)))}
                disabled={isSpinning || inFree}
                className="p-1.5 text-amber-300 hover:bg-stone-700 rounded-lg disabled:opacity-50"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBet((b) => +(b + 1.0).toFixed(2))}
                disabled={isSpinning || inFree}
                className="p-1.5 text-amber-300 hover:bg-stone-700 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setAutoSpinsLeft(autoSpinsLeft > 0 ? 0 : 10)}
              disabled={isSpinning || inFree}
              className={`p-2 rounded-xl font-bold text-[10px] border transition ${
                autoSpinsLeft > 0
                  ? "bg-rose-600 text-white border-rose-400"
                  : "bg-stone-800 text-amber-200 border-stone-700 hover:bg-stone-700"
              } disabled:opacity-50`}
            >
              {autoSpinsLeft > 0 ? `${autoSpinsLeft}` : "AUTO"}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-yellow-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-lg font-black text-yellow-300 mb-1">BUY FREE SPINS FEATURE</h3>
            <p className="text-xs text-slate-300 mb-3">
              Instantly trigger 10 Free Spins with guaranteed Scatters and progressive cascade multipliers!
            </p>

            <div className="bg-stone-950 rounded-xl p-3 mb-4 border border-stone-800">
              <span className="text-[10px] text-amber-400 font-semibold block uppercase">Cost</span>
              <span className="text-2xl font-black text-yellow-400">₱{(bet * 100).toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-2 rounded-xl font-bold bg-stone-800 text-slate-300 hover:bg-stone-700 transition text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleBuyFeature}
                className="flex-1 py-2 rounded-xl font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-yellow-950 hover:brightness-110 transition shadow-lg shadow-yellow-500/30 text-xs"
              >
                CONFIRM BUY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
