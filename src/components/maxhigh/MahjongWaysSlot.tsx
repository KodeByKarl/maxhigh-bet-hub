/**
 * Mahjong Ways — polished layout matching Candy Peak chrome.
 * Engine resolves spins instantly; this file plays back the animation script.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Menu, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { DEFAULT_MAHJONG_WAYS_CONFIG } from "@/lib/mahjong-ways-config";
import { getMahjongWaysEngineConfigFn } from "@/functions/superadmin";
import {
  getMahjongWaysSessionFn,
  mahjongWaysBuyFeatureFn,
  mahjongWaysFreeSpinFn,
  mahjongWaysSpinFn,
} from "@/functions/api";
import { ANIM } from "./mahjong-ways/animationConfig";
import { mahjongAudio } from "./mahjong-ways/audio";
import { TILE_IMAGE_MAP } from "./mahjong-ways/MahjongIcon";
import { MahjongSidePanel } from "./mahjong-ways/MahjongSidePanel";
import { ReelCell, type ReelPhase } from "./mahjong-ways/ReelCell";
import { getMahjongWaysConfig, setMahjongWaysConfig } from "./mahjong-ways/runtimeConfig";
import type { BoardCell, SpinScript } from "./mahjong-ways/types";

type MahjongWaysSlotProps = {
  onBalanceUpdate?: () => void;
};

const COLS = 5;
const ROWS = 4;
const EMPTY_SET = new Set<string>();
const EMPTY_FALL: Record<string, number> = Object.freeze({}) as Record<string, number>;
const BET_STEPS = [1, 2, 5, 10, 20, 50, 100];

function createInitialBoard(): BoardCell[] {
  const symbols = DEFAULT_MAHJONG_WAYS_CONFIG.symbols;
  const board: BoardCell[] = [];
  let keyCounter = 1;

  for (let r = 0; r < COLS; r++) {
    for (let row = 0; row < ROWS; row++) {
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

function preloadAssets() {
  if (typeof Image === "undefined") return;
  const urls = ["/games/mahjong-ways.webp", ...Object.values(TILE_IMAGE_MAP)];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

function betIndex(bet: number) {
  const i = BET_STEPS.findIndex((v) => v >= bet);
  if (i === -1) return BET_STEPS.length - 1;
  return i;
}

function buildFallMap(
  step: SpinScript["steps"][number],
  nextBoard: BoardCell[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const key of step.fallenKeys) map[key] = 1;
  for (const key of step.spawnedKeys) {
    const cell = nextBoard.find((c) => c.key === key);
    map[key] = cell ? cell.rowIndex + 1.2 : 1.5;
  }
  return map;
}

export function MahjongWaysSlot({ onBalanceUpdate }: MahjongWaysSlotProps) {
  const { user } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(5);
  const [ante, setAnte] = useState(false);
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [fsSessionWin, setFsSessionWin] = useState(0);
  const [inFree, setInFree] = useState(false);

  const [reelHeights, setReelHeights] = useState<number[]>([4, 4, 4, 4, 4]);
  const [board, setBoard] = useState<BoardCell[]>(() => createInitialBoard());
  const [winningKeys, setWinningKeys] = useState<Set<string>>(EMPTY_SET);
  const [spawnedKeys, setSpawnedKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallenKeys, setFallenKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallDistance, setFallDistance] = useState<Record<string, number>>(EMPTY_FALL);
  const [currentMult, setCurrentMult] = useState(1);
  const [totalWays, setTotalWays] = useState(1024);
  const [lastWin, setLastWin] = useState(0);
  const [dropTotal, setDropTotal] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cfgTick, setCfgTick] = useState(0);

  const busy = phase !== "idle";
  const engineCfg = getMahjongWaysConfig();

  /** Dense slot index — O(1) lookup instead of board.find per cell. */
  const slotIndex = useMemo(() => {
    const slots: (BoardCell | null)[] = Array.from({ length: COLS * ROWS }, () => null);
    for (const c of board) {
      const i = c.rowIndex * COLS + c.reelIndex;
      if (i >= 0 && i < slots.length) slots[i] = c;
    }
    return slots;
  }, [board]);

  const isDropping = phase === "dropping";
  const isGlowing = phase === "glow";
  const isPopping = phase === "popping";
  const isFalling = phase === "falling";
  const anteMult = engineCfg.anteBetMult;
  const buyMult = engineCfg.buyFeatureMult;
  const totalBet = +(bet * (ante ? anteMult : 1)).toFixed(2);
  const buyCost = +(bet * buyMult).toFixed(2);
  const multList = inFree
    ? engineCfg.freeSpinsCascadeMultipliers
    : engineCfg.baseCascadeMultipliers;
  const displayWin = inFree ? fsSessionWin : lastWin;
  void cfgTick; // force re-read of module config after Superadmin sync

  const busyRef = useRef(false);
  const turboRef = useRef(turbo);
  const autoSpinRef = useRef(autoSpin);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const spinRef = useRef<() => Promise<void>>(async () => undefined);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  turboRef.current = turbo;
  autoSpinRef.current = autoSpin;

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
    mahjongAudio.preload();
    void getMahjongWaysEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        setMahjongWaysConfig(cfg);
        setCfgTick((n) => n + 1);
      })
      .catch(() => undefined);
    getMahjongWaysSessionFn()
      .then((sess) => {
        if (sess && sess.inFree && mountedRef.current) {
          setSessionId(sess.sessionId);
          setFreeSpinsLeft(sess.freeSpinsLeft);
          setFsSessionWin(sess.fsSessionWin);
          setInFree(true);
          toast.info(`Resuming Free Spins (${sess.freeSpinsLeft} left)`);
        }
      })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      mahjongAudio.stopSpinLoop();
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
    };
  }, []);

  const refreshEngineConfig = useCallback(async () => {
    try {
      const cfg = await getMahjongWaysEngineConfigFn();
      if (!mountedRef.current) return;
      setMahjongWaysConfig(cfg);
      setCfgTick((n) => n + 1);
    } catch {
      /* keep current */
    }
  }, []);

  const animateScript = useCallback(
    async (script: SpinScript, gen: number) => {
      setReelHeights(script.initialReelHeights);
      setTotalWays(script.totalWays);
      setDropTotal(0);
      setWinningKeys(EMPTY_SET);
      setSpawnedKeys(EMPTY_SET);
      setFallenKeys(EMPTY_SET);
      setFallDistance(EMPTY_FALL);
      setCurrentMult(1);
      setLastWin(0);

      // Force a clean drop: clear → land new board (remounts every tile spring)
      setPhase("dropping");
      mahjongAudio.playSpin();
      setBoard([]);
      await wait(32, gen);
      setBoard(script.initialBoard);
      await wait(
        ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow,
        gen,
      );
      mahjongAudio.playReelStop();

      let cascadeWin = 0;

      for (let i = 0; i < script.steps.length; i++) {
        if (gen !== playbackGen.current) break;
        const step = script.steps[i];
        const winKeys = Array.isArray(step.evalResult.winningKeys)
          ? step.evalResult.winningKeys
          : [];

        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
        setBoard(step.board);
        setCurrentMult(step.multiplier);

        if (winKeys.length === 0) {
          break;
        }

        setWinningKeys(new Set(winKeys));
        cascadeWin += step.stepWin;
        setDropTotal(cascadeWin);
        setPhase("glow");
        await wait(ANIM.glowDuration, gen);

        setPhase("popping");
        await wait(
          ANIM.popDuration + Math.min(winKeys.length, 12) * ANIM.popStagger,
          gen,
        );

        setWinningKeys(EMPTY_SET);
        await wait(ANIM.holeHold, gen);

        const nextBoard = script.steps[i + 1]?.board;
        if (nextBoard) {
          setFallenKeys(new Set(step.fallenKeys ?? []));
          setSpawnedKeys(new Set(step.spawnedKeys ?? []));
          setFallDistance(buildFallMap(step, nextBoard));
          setBoard(nextBoard);
          setPhase("falling");
          await wait(
            ANIM.refillDuration + COLS * ANIM.fallStaggerCol + ANIM.fallStaggerRow * 2,
            gen,
          );
          await wait(ANIM.betweenTumbles, gen);
        }
      }

      if (gen === playbackGen.current) {
        setLastWin(script.totalWin);
        setPhase("idle");
        setSpawnedKeys(EMPTY_SET);
        setFallenKeys(EMPTY_SET);
        setFallDistance(EMPTY_FALL);
      }
      onBalanceUpdate?.();
    },
    [onBalanceUpdate, wait],
  );

  const handleSpin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    playbackGen.current += 1;
    const gen = playbackGen.current;
    setWinningKeys(EMPTY_SET);
    setLastWin(0);
    setBanner(null);
    // Lock UI immediately so the spin button disables while the API resolves
    setPhase("dropping");
    mahjongAudio.playSpin();

    const abortIfStale = () => {
      if (!mountedRef.current) return true;
      if (gen !== playbackGen.current) return true;
      return false;
    };

    try {
      await refreshEngineConfig();
      if (inFree && sessionId) {
        const res = await mahjongWaysFreeSpinFn({ data: { sessionId } });
        if (abortIfStale()) return;
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(res.session.fsSessionWin);
        setInFree(res.session.inFree);
        await animateScript(res.script, gen);
        if (abortIfStale()) return;
        if (res.fsPayout) {
          setBanner(`Free Spins Complete! ${formatMoney(res.fsPayout.amount)}`);
          toast.success(`Free Spins Complete! Won ${formatMoney(res.fsPayout.amount)}`, {
            duration: 6000,
          });
        }
      } else {
        const res = await mahjongWaysSpinFn({ data: { bet, ante } });
        if (abortIfStale()) return;
        const triggeredFs = res.session.inFree;
        if (triggeredFs) {
          setSessionId(res.session.sessionId);
          setFreeSpinsLeft(res.session.freeSpinsLeft);
          setFsSessionWin(0);
          setInFree(true);
        }
        await animateScript(res.script, gen);
        if (abortIfStale()) return;
        if (triggeredFs) {
          setBanner(`${res.session.freeSpinsLeft} Free Spins!`);
          toast.success(`Scatter! ${res.session.freeSpinsLeft} Free Spins awarded`);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // superseded / unmounted — ignore
      } else {
        const msg = err instanceof Error ? err.message : "Spin failed";
        toast.error(msg);
        setAutoSpin(false);
      }
      if (mountedRef.current && gen === playbackGen.current) {
        setPhase("idle");
        mahjongAudio.stopSpinLoop();
      }
    } finally {
      if (gen === playbackGen.current) {
        busyRef.current = false;
      }
    }
  }, [animateScript, ante, bet, inFree, refreshEngineConfig, sessionId]);

  spinRef.current = handleSpin;

  const handleBuyFeature = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setShowBuyModal(false);
    playbackGen.current += 1;
    const gen = playbackGen.current;
    setBanner(null);
    setPhase("dropping");
    mahjongAudio.playSpin();

    try {
      const res = await mahjongWaysBuyFeatureFn({ data: { bet } });
      if (!mountedRef.current || gen !== playbackGen.current) return;
      if (res.session.inFree) {
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(0);
        setInFree(true);
      }
      await animateScript(res.script, gen);
      if (!mountedRef.current || gen !== playbackGen.current) return;
      toast.success(`Feature Buy! ${res.session.freeSpinsLeft} Free Spins`);
      setBanner(`${res.session.freeSpinsLeft} Free Spins!`);
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const msg = err instanceof Error ? err.message : "Buy Feature failed";
        toast.error(msg);
      }
      if (mountedRef.current && gen === playbackGen.current) {
        setPhase("idle");
        mahjongAudio.stopSpinLoop();
      }
    } finally {
      if (gen === playbackGen.current) {
        busyRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 2800);
    return () => clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    if (!autoSpin || busy || inFree) return;
    const id = setTimeout(() => {
      void spinRef.current();
    }, 420);
    return () => clearTimeout(id);
  }, [autoSpin, busy, inFree, lastWin]);

  useEffect(() => {
    if (!inFree || busy || freeSpinsLeft <= 0) return;
    const id = setTimeout(() => {
      void spinRef.current();
    }, 500);
    return () => clearTimeout(id);
  }, [inFree, busy, freeSpinsLeft, lastWin]);

  const nudgeBet = (dir: -1 | 1) => {
    const i = betIndex(bet);
    const next = BET_STEPS[Math.max(0, Math.min(BET_STEPS.length - 1, i + dir))];
    setBet(next);
  };

  const showTumbleBadge =
    dropTotal > 0 && (phase === "glow" || phase === "popping" || phase === "falling");

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none">
      {/* Full-bleed themed backdrop */}
      <img
        src="/games/mahjong-ways.webp"
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(127,29,29,0.35) 0%, rgba(15,23,42,0.72) 55%, rgba(0,0,0,0.88) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-1.5 pt-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.35rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:px-3 sm:py-2">
        <div className="flex min-h-0 w-full max-w-[1600px] flex-1 flex-col sm:h-full sm:max-h-full sm:items-center sm:gap-2">
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-1.5 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
            {/* LEFT RAIL */}
            <div className="hidden h-full min-w-0 items-center justify-end sm:flex">
              <div className="flex w-full flex-col items-stretch justify-center gap-2.5">
                {inFree ? (
                  <>
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
                          background: "linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)",
                        }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Multiplier
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          ×{currentMult}
                        </div>
                      </div>
                    </div>
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
                          background: "linear-gradient(180deg, #b45309 0%, #7c2d12 100%)",
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
                    <div
                      className="w-full rounded-[1.2rem] p-[4px]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 18%,#D4A017 48%,#B8860B 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{
                          background: "linear-gradient(180deg, #15803d 0%, #14532d 100%)",
                        }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Free Spins
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          {freeSpinsLeft}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <MahjongSidePanel
                    buyCost={buyCost}
                    totalBet={totalBet}
                    ante={ante}
                    busy={busy}
                    onBuy={() => setShowBuyModal(true)}
                    onAnteChange={setAnte}
                  />
                )}
              </div>
            </div>

            {/* GRID + CONTROLS COLUMN — mobile fills full height, no dead space */}
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
              <div className="flex min-h-0 w-full flex-1 flex-col sm:mx-auto sm:max-w-full sm:items-center">
                {/* Compact title + multiplier strip */}
                <div className="flex shrink-0 flex-col items-center gap-1 px-1 sm:mb-1.5 sm:gap-1.5">
                  <div
                    className="flex items-center gap-2 rounded-full px-3.5 py-1 shadow-[0_8px_22px_rgba(212,160,23,0.45)] sm:px-5"
                    style={{
                      background:
                        "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 25%,#D4A017 70%,#B8860B 100%)",
                      border: "2px solid #7f1d1d",
                    }}
                  >
                    <span
                      className="text-[0.95rem] font-black tracking-wide sm:text-base"
                      style={{
                        color: "#450a0a",
                        textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                      }}
                    >
                      Mahjong Ways
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#7f1d1d]/85 sm:text-[10px]">
                      {totalWays} Ways
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3.5 sm:gap-5">
                    {multList.map((m) => {
                      const isActive = currentMult === m;
                      return (
                        <span
                          key={m}
                          className={cn(
                            "text-xl font-black italic transition-all duration-300 sm:text-2xl",
                            isActive
                              ? "scale-125 text-[#F5D76E] drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                              : "text-amber-700/55",
                          )}
                        >
                          x{m}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* REELS — grow to fill leftover height on mobile; 5:4 aspect on sm+ */}
                <div className="relative mt-1 flex min-h-0 w-full flex-1 items-stretch justify-center sm:mt-0 sm:items-center">
                  <div
                    className="relative h-full w-full sm:mx-auto sm:aspect-[5/4] sm:h-auto sm:max-h-full sm:w-full"
                    style={{
                      maxWidth: "min(100%, calc(82dvh * 5 / 4))",
                    }}
                  >
                    {showTumbleBadge && (
                      <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                        <div
                          className="rounded-full border-2 border-yellow-300 px-4 py-1.5 text-center shadow-[0_0_20px_rgba(250,204,21,0.65)]"
                          style={{
                            background:
                              "linear-gradient(180deg, #dc2626 0%, #991b1b 55%, #450a0a 100%)",
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
                            Cascade Win
                          </div>
                          <div className="text-xl font-black leading-none text-yellow-300 tabular-nums">
                            {formatMoney(dropTotal)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lacquer red–gold frame */}
                    <div
                      className="relative size-full rounded-[0.85rem] p-[3px] shadow-[0_18px_50px_rgba(127,29,29,0.55)] sm:rounded-[1.25rem] sm:p-[9px]"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg, #F5D76E 0 10px, #B8860B 10px 20px, #7f1d1d 20px 30px, #F5D76E 30px 40px)",
                      }}
                    >
                      <div
                        className="relative size-full overflow-hidden rounded-[0.55rem] sm:rounded-[0.9rem]"
                        style={{
                          background:
                            "linear-gradient(180deg, #166534 0%, #14532d 40%, #052e16 100%)",
                          boxShadow: "inset 0 0 40px rgba(0,0,0,0.45)",
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12)_0%,transparent_65%)]" />
                        <div
                          className="relative grid size-full gap-[2px] p-[2px] sm:gap-1 sm:p-1"
                          style={{
                            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                          }}
                        >
                          {Array.from({ length: COLS * ROWS }, (_, i) => {
                            const col = i % COLS;
                            const row = Math.floor(i / COLS);
                            const height = reelHeights[col] || ROWS;
                            if (row >= height) {
                              return <div key={`empty-${i}`} className="min-h-0 min-w-0" />;
                            }
                            const cell = slotIndex[i] ?? null;
                            const win = cell ? winningKeys.has(cell.key) : false;
                            return (
                              <ReelCell
                                key={`slot-${i}`}
                                cell={cell}
                                col={col}
                                row={row}
                                isDropping={isDropping && !!cell}
                                isGlowing={isGlowing && win}
                                isPopping={isPopping && win}
                                isFalling={
                                  isFalling &&
                                  !!cell &&
                                  (spawnedKeys.has(cell.key) || fallenKeys.has(cell.key))
                                }
                                win={win}
                                isSpawn={cell ? spawnedKeys.has(cell.key) : false}
                                isFallen={cell ? fallenKeys.has(cell.key) : false}
                                fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile buy / ante — larger tap targets */}
                {!inFree && (
                  <div className="mt-1.5 flex shrink-0 gap-2 sm:hidden">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setShowBuyModal(true)}
                      className="min-h-11 flex-1 rounded-xl border-2 border-[#E8C547] bg-[#b91c1c] px-3 py-2 text-xs font-black uppercase text-white"
                    >
                      Buy FS {formatMoneyCompact(buyCost)}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setAnte((v) => !v)}
                      className={cn(
                        "min-h-11 flex-1 rounded-xl border-2 border-[#E8C547] px-3 py-2 text-xs font-black uppercase",
                        ante
                          ? "bg-[#F5D76E] text-[#450a0a]"
                          : "bg-[#14532d] text-[#F5D76E]",
                      )}
                    >
                      Ante {ante ? "ON" : "OFF"}
                    </button>
                  </div>
                )}

                {/* BOTTOM BAR — full width, larger for older players */}
                <div
                  className="mt-1.5 w-full shrink-0 rounded-[1.15rem] p-[4px] shadow-[0_12px_36px_rgba(69,10,10,0.55)] sm:mt-2"
                  style={{
                    background:
                      "repeating-linear-gradient(135deg, #FFF3B0 0 8px, #F5D76E 8px 16px, #D4A017 16px 24px, #FFF3B0 24px 32px)",
                  }}
                >
                  <div
                    className="flex flex-col gap-2.5 rounded-[0.95rem] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(153,27,27,0.97) 0%, rgba(69,10,10,0.98) 100%)",
                    }}
                  >
                    <div className="flex min-w-0 flex-col gap-2 sm:min-w-[150px] sm:gap-1.5">
                      <div className="grid grid-cols-3 gap-2 font-black tracking-wide sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-4">
                        <div className="min-w-0 text-center sm:text-left">
                          <div className="text-[11px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Credit
                          </div>
                          <div className="truncate text-base tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(balance)}
                          </div>
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                          <div className="text-[11px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Bet
                          </div>
                          <div className="truncate text-base tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(totalBet)}
                          </div>
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                          <div className="text-[11px] uppercase text-[#F5D76E]/90 sm:text-xs">
                            Win
                          </div>
                          <div className="truncate text-base tabular-nums text-[#F5D76E] sm:text-base">
                            {formatMoney(displayWin)}
                          </div>
                        </div>
                      </div>
                      <div className="hidden items-center gap-1.5 sm:flex">
                        <button
                          type="button"
                          onClick={() => setShowBuyModal(true)}
                          disabled={busy || inFree}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#450a0a] text-[#F5D76E] shadow transition hover:brightness-110 disabled:opacity-40"
                          aria-label="Buy feature"
                        >
                          <Menu size={14} />
                        </button>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#450a0a] text-[#F5D76E] shadow transition hover:brightness-110"
                          aria-label="Info"
                          title={`${totalWays} ways · gold tiles turn wild`}
                        >
                          <Info size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-2 sm:justify-center">
                      <button
                        type="button"
                        onClick={() => setShowBuyModal(true)}
                        disabled={busy || inFree}
                        className="grid size-11 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#450a0a] text-[#F5D76E] shadow transition hover:brightness-110 disabled:opacity-40 sm:hidden"
                        aria-label="Menu"
                      >
                        <Menu size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTurbo((v) => !v)}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow transition sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs",
                          turbo
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#450a0a]"
                            : "border-[#E8C547]/80 bg-[#450a0a] text-[#F5D76E]",
                        )}
                        aria-pressed={turbo}
                      >
                        <Zap size={14} />
                        Turbo
                      </button>

                      <button
                        type="button"
                        className="grid size-11 place-items-center rounded-full border-2 border-[#E8C547]/70 bg-[#450a0a] text-[#F5D76E] shadow transition hover:brightness-110 sm:hidden"
                        aria-label="Info"
                        title={`${totalWays} ways · gold tiles turn wild`}
                      >
                        <Info size={18} />
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 self-center">
                      <div className="flex items-center gap-3 sm:gap-2.5">
                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-12 place-items-center rounded-full border-[3px] border-[#E8C547] text-2xl font-black text-white shadow-lg disabled:opacity-40 sm:size-11 sm:text-xl"
                          style={{
                            background: "linear-gradient(180deg,#dc2626 0%,#7f1d1d 100%)",
                          }}
                          aria-label="Decrease bet"
                        >
                          −
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleSpin()}
                          className="relative grid size-[5.25rem] place-items-center rounded-full border-[4px] border-[#E8C547] shadow-[0_8px_28px_rgba(212,160,23,0.45)] disabled:opacity-60 sm:size-[76px]"
                          style={{
                            background:
                              "radial-gradient(circle at 35% 28%, #f87171 0%, #b91c1c 42%, #450a0a 100%)",
                          }}
                          aria-label="Spin"
                        >
                          {busy ? (
                            <svg
                              viewBox="0 0 24 24"
                              className="size-10 animate-spin text-[#F5D76E] sm:size-9"
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
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              className="size-10 text-[#F5D76E] sm:size-9"
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
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => nudgeBet(1)}
                          className="grid size-12 place-items-center rounded-full border-[3px] border-[#E8C547] text-2xl font-black text-white shadow-lg disabled:opacity-40 sm:size-11 sm:text-xl"
                          style={{
                            background: "linear-gradient(180deg,#dc2626 0%,#7f1d1d 100%)",
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
                          "min-h-10 rounded-full border-2 px-6 py-1.5 text-xs font-black uppercase tracking-wider shadow sm:min-h-0 sm:px-5 sm:py-1 sm:text-xs",
                          autoSpin
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#450a0a]"
                            : "border-[#E8C547]/80 bg-[#450a0a] text-[#F5D76E]",
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

      {/* Banner overlay */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-[2px]"
            onClick={() => setBanner(null)}
          >
            <div className="rounded-2xl border-4 border-[#F5D76E] bg-gradient-to-b from-red-500 to-red-900 px-10 py-5 text-center shadow-2xl">
              <h2 className="font-black uppercase tracking-widest text-[#F5D76E] drop-shadow-md sm:text-lg">
                {banner}
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Buy Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border-2 border-[#E8C547]/50 p-[4px] shadow-2xl"
              style={{
                background:
                  "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 25%,#D4A017 70%,#B8860B 100%)",
              }}
            >
              <div
                className="rounded-[0.9rem] p-5 text-center"
                style={{
                  background: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
                }}
              >
                <h3 className="mb-1 text-lg font-black text-[#F5D76E]">BUY FREE SPINS</h3>
                <p className="mb-3 text-xs text-amber-100/80">
                  Instantly trigger Free Spins (12 base +2 per extra scatter) with progressive cascade
                  multipliers (×2 → ×10).
                </p>
                <div className="mb-4 rounded-xl border border-[#E8C547]/30 bg-black/40 p-3">
                  <span className="block text-[10px] font-semibold uppercase text-amber-400">
                    Cost
                  </span>
                  <span className="text-2xl font-black text-[#F5D76E]">
                    {formatMoney(buyCost)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    className="flex-1 rounded-xl bg-black/40 py-2 text-xs font-bold text-amber-100/80 transition hover:bg-black/60"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBuyFeature()}
                    className="flex-1 rounded-xl border border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] py-2 text-xs font-black text-[#450a0a] shadow-lg transition hover:brightness-110"
                  >
                    CONFIRM BUY
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
