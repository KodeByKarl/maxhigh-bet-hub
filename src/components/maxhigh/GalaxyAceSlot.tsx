/**
 * Galaxy Ace — polished layout matching Candy Peak chrome.
 * Engine resolves spins instantly; this file plays back the animation script.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Menu, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import { DEFAULT_GALAXY_ACE_CONFIG } from "@/lib/galaxy-ace-config";
import { getGalaxyAceEngineConfigFn } from "@/functions/superadmin";
import {
  getGalaxyAceSessionFn,
  galaxyAceBuyFeatureFn,
  galaxyAceFreeSpinFn,
  galaxyAceSpinFn,
} from "@/functions/api";
import { ANIM } from "./galaxy-ace/animationConfig";
import { galaxyAceAudio } from "./galaxy-ace/audio";
import { GalaxyAceSidePanel } from "./galaxy-ace/GalaxyAceSidePanel";
import { ReelCell, type ReelPhase } from "./galaxy-ace/ReelCell";
import { TILE_IMAGE_MAP } from "./galaxy-ace/GalaxyAceIcon";
import { PaytableModal } from "./galaxy-ace/PaytableModal";
import { getGalaxyAceConfig, setGalaxyAceConfig } from "./galaxy-ace/runtimeConfig";
import type { BoardCell, SpinScript } from "./galaxy-ace/types";

type GalaxyAceSlotProps = {
  onBalanceUpdate?: () => void;
};

const COLS = 5;
const ROWS = 5;
const EMPTY_SET = new Set<string>();
const EMPTY_FALL: Record<string, number> = Object.freeze({}) as Record<string, number>;
const BET_STEPS = [1, 2, 5, 10, 20, 50, 100];

function createInitialBoard(): BoardCell[] {
  const symbols = DEFAULT_GALAXY_ACE_CONFIG.symbols;
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

const GALAXY_ACE_BACKDROP = "/images/symbols/galaxy-ace/backdrop.webp";

function preloadAssets() {
  if (typeof Image === "undefined") return;
  const urls = [
    "/games/galaxy-ace.webp",
    GALAXY_ACE_BACKDROP,
    ...Object.values(TILE_IMAGE_MAP),
  ];
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

export function GalaxyAceSlot({ onBalanceUpdate }: GalaxyAceSlotProps) {
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

  const [reelHeights, setReelHeights] = useState<number[]>([5, 5, 5, 5, 5]);
  const [board, setBoard] = useState<BoardCell[]>(() => createInitialBoard());
  const [winningKeys, setWinningKeys] = useState<Set<string>>(EMPTY_SET);
  const [spawnedKeys, setSpawnedKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallenKeys, setFallenKeys] = useState<Set<string>>(EMPTY_SET);
  const [fallDistance, setFallDistance] = useState<Record<string, number>>(EMPTY_FALL);
  const [currentMult, setCurrentMult] = useState(1);
  const [totalWays, setTotalWays] = useState(3125);
  const [lastWin, setLastWin] = useState(0);
  const [dropTotal, setDropTotal] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cfgTick, setCfgTick] = useState(0);

  const busy = phase !== "idle";
  const engineCfg = getGalaxyAceConfig();
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
    galaxyAceAudio.preload();
    void getGalaxyAceEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        setGalaxyAceConfig(cfg);
        setCfgTick((n) => n + 1);
      })
      .catch(() => undefined);
    getGalaxyAceSessionFn()
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
      galaxyAceAudio.stopSpinLoop();
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
    };
  }, []);

  const refreshEngineConfig = useCallback(async () => {
    try {
      const cfg = await getGalaxyAceEngineConfigFn();
      if (!mountedRef.current) return;
      setGalaxyAceConfig(cfg);
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
      galaxyAceAudio.playSpin();
      setBoard([]);
      await wait(32, gen);
      setBoard(script.initialBoard);
      await wait(
        ANIM.dropDuration + COLS * ANIM.dropStaggerCol + ROWS * ANIM.dropStaggerRow,
        gen,
      );
      galaxyAceAudio.playReelStop();

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
    galaxyAceAudio.playSpin();

    const abortIfStale = () => {
      if (!mountedRef.current) return true;
      if (gen !== playbackGen.current) return true;
      return false;
    };

    try {
      await refreshEngineConfig();
      if (inFree && sessionId) {
        const res = await galaxyAceFreeSpinFn({ data: { sessionId } });
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
        const res = await galaxyAceSpinFn({ data: { bet, ante } });
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
        galaxyAceAudio.stopSpinLoop();
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
    galaxyAceAudio.playSpin();

    try {
      const res = await galaxyAceBuyFeatureFn({ data: { bet } });
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
        galaxyAceAudio.stopSpinLoop();
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
      {/* Full-bleed themed backdrop (portrait art; square logo thumb lives in /games/) */}
      <img
        src={GALAXY_ACE_BACKDROP}
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
            "linear-gradient(180deg, rgba(255,245,255,0.12) 0%, rgba(180,150,220,0.22) 35%, rgba(90,60,140,0.45) 72%, rgba(40,20,70,0.72) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1600px] flex-col items-center gap-1.5 sm:gap-2">
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-2 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
            {/* LEFT RAIL */}
            <div className="hidden h-full min-w-0 items-center justify-end sm:flex">
              <div className="flex w-full flex-col items-stretch justify-center gap-2.5">
                {inFree ? (
                  <>
                    <div
                      className="w-full rounded-[1.2rem] p-[4px] shadow-[0_10px_28px_rgba(126,34,206,0.4)]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF6C8 0%,#E9D5FF 35%,#C4B5FD 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{
                          background: "linear-gradient(180deg, #9333ea 0%, #6b21a8 100%)",
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
                      className="w-full rounded-[1.2rem] p-[4px] shadow-[0_10px_28px_rgba(79,70,229,0.4)]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF6C8 0%,#E9D5FF 35%,#C4B5FD 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{
                          background: "linear-gradient(180deg, #6366f1 0%, #4338ca 100%)",
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
                          "linear-gradient(180deg,#FFF6C8 0%,#E9D5FF 35%,#C4B5FD 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{
                          background: "linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)",
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
                  <GalaxyAceSidePanel
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

            {/* GRID COLUMN — board + bar share one width (not full viewport stretch) */}
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 max-h-full flex-col items-stretch"
                style={{
                  width: `min(100%, calc((100dvh - 10rem) * ${COLS} / ${ROWS}))`,
                }}
              >
                {/* Title / ways pill */}
                <div
                  className="mx-auto mb-1 flex shrink-0 items-center gap-2 rounded-full px-3 py-0.5 shadow-[0_8px_22px_rgba(212,160,23,0.45)] sm:mb-1.5 sm:px-4"
                  style={{
                    background:
                      "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 25%,#D4A017 70%,#B8860B 100%)",
                    border: "2px solid #7f1d1d",
                  }}
                >
                  <span
                    className="text-xs font-black tracking-wide sm:text-sm"
                    style={{
                      color: "#450a0a",
                      textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                    }}
                  >
                    Galaxy Ace
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#7f1d1d]/80 sm:text-[10px]">
                    {totalWays} Ways
                  </span>
                </div>

                {/* Multiplier strip */}
                <div className="mb-1 flex shrink-0 items-center justify-center gap-2.5 sm:mb-1.5 sm:gap-4">
                  {multList.map((m) => {
                    const isActive = currentMult === m;
                    return (
                      <span
                        key={m}
                        className={cn(
                          "text-base font-black italic transition-all duration-300 sm:text-xl",
                          isActive
                            ? "scale-125 text-[#F5D76E] drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                            : "text-fuchsia-200/45",
                        )}
                      >
                        x{m}
                      </span>
                    );
                  })}
                </div>

                <div className="relative min-h-0 w-full flex-1 overflow-hidden">
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
                              "linear-gradient(180deg, #dc2626 0%, #991b1b 55%, #450a0a 100%)",
                          }}
                        >
                          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white">
                            Cascade Win
                          </div>
                          <div className="text-lg font-black leading-none text-yellow-300 tabular-nums">
                            {formatMoney(dropTotal)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className="relative size-full rounded-[0.85rem] p-[5px] shadow-[0_18px_50px_rgba(120,80,200,0.45)] sm:rounded-[1.1rem] sm:p-[7px]"
                      style={{
                        background:
                          "linear-gradient(145deg, #FFF6C8 0%, #F5D76E 28%, #D4A017 58%, #B8860B 100%)",
                      }}
                    >
                      <div
                        className="relative size-full overflow-hidden rounded-[0.55rem] sm:rounded-[0.75rem]"
                        style={{
                          background:
                            "linear-gradient(180deg, #FFF8EC 0%, #F3E7D3 45%, #E8D5B8 100%)",
                          boxShadow: "inset 0 0 36px rgba(180,140,90,0.28)",
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,transparent_70%)]" />
                        <div
                          className="relative grid size-full gap-px p-px sm:gap-[2px] sm:p-[2px]"
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
                            const cell =
                              board.find((c) => c.reelIndex === col && c.rowIndex === row) ??
                              null;
                            const win = cell ? winningKeys.has(cell.key) : false;
                            return (
                              <ReelCell
                                key={`slot-${i}`}
                                cell={cell}
                                col={col}
                                row={row}
                                phase={phase}
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

                {/* Mobile buy / ante */}
                {!inFree && (
                  <div className="mt-1 flex shrink-0 justify-center gap-2 sm:hidden">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setShowBuyModal(true)}
                      className="rounded-lg border-2 border-[#E8C547] bg-gradient-to-b from-[#c084fc] to-[#6b21a8] px-3 py-1.5 text-[10px] font-black uppercase text-white"
                    >
                      Buy FS {formatMoneyCompact(buyCost)}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setAnte((v) => !v)}
                      className={cn(
                        "rounded-lg border-2 border-[#E8C547] px-3 py-1.5 text-[10px] font-black uppercase",
                        ante
                          ? "bg-gradient-to-b from-[#fde68a] to-[#b45309] text-[#450a0a]"
                          : "bg-gradient-to-b from-[#a5b4fc] to-[#4338ca] text-[#F5D76E]",
                      )}
                    >
                      Ante {ante ? "ON" : "OFF"}
                    </button>
                  </div>
                )}

                {/* BOTTOM BAR — same width as board */}
                <div
                  className="mt-1 w-full shrink-0 rounded-xl p-[2px] shadow-[0_8px_24px_rgba(90,50,160,0.4)] sm:mt-1.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #FFF6C8 0%, #E9D5FF 35%, #C4B5FD 65%, #F5D76E 100%)",
                  }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-[10px] px-2 py-1.5 sm:flex-nowrap sm:gap-3 sm:px-3 sm:py-1.5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(109,40,217,0.92) 0%, rgba(76,29,149,0.96) 55%, rgba(46,16,101,0.98) 100%)",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBuyModal(true)}
                        disabled={busy || inFree}
                        className="grid size-6 shrink-0 place-items-center rounded-full border border-[#E8C547]/80 bg-[#2e1065] text-[#F5D76E] transition hover:brightness-110 disabled:opacity-40 sm:size-7"
                        aria-label="Buy feature"
                      >
                        <Menu size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        className="grid size-6 shrink-0 place-items-center rounded-full border border-[#E8C547]/80 bg-[#2e1065] text-[#F5D76E] transition hover:brightness-110 sm:size-7"
                        aria-label="Info"
                        title="Paytable & rules"
                      >
                        <Info size={12} />
                      </button>
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0 font-black tracking-wide sm:gap-x-3">
                        <div className="whitespace-nowrap text-[10px] sm:text-xs">
                          <span className="uppercase text-[#F5D76E]/85">Credit </span>
                          <span className="tabular-nums text-[#F5D76E]">{formatMoney(balance)}</span>
                        </div>
                        <div className="whitespace-nowrap text-[10px] sm:text-xs">
                          <span className="uppercase text-[#F5D76E]/85">Bet </span>
                          <span className="tabular-nums text-[#F5D76E]">{formatMoney(totalBet)}</span>
                        </div>
                        <div className="whitespace-nowrap text-[10px] sm:text-xs">
                          <span className="uppercase text-[#F5D76E]/85">Win </span>
                          <span className="tabular-nums text-[#F5D76E]">{formatMoney(displayWin)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTurbo((v) => !v)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition sm:px-2.5 sm:text-[10px]",
                        turbo
                          ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#450a0a]"
                          : "border-[#E8C547]/80 bg-[#2e1065] text-[#F5D76E]",
                      )}
                      aria-pressed={turbo}
                    >
                      <Zap size={10} />
                      Turbo
                    </button>

                    <div className="flex flex-col items-center gap-0.5 self-center">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy || inFree}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547] text-base font-black text-white shadow disabled:opacity-40 sm:size-9"
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
                          className="relative grid size-12 place-items-center rounded-full border-[3px] border-[#E8C547] shadow-[0_6px_18px_rgba(212,160,23,0.4)] disabled:opacity-60 sm:size-14"
                          style={{
                            background:
                              "radial-gradient(circle at 35% 28%, #f87171 0%, #b91c1c 42%, #450a0a 100%)",
                          }}
                          aria-label="Spin"
                        >
                          {busy ? (
                            <svg
                              viewBox="0 0 24 24"
                              className="size-6 animate-spin text-[#F5D76E] sm:size-7"
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
                              className="size-6 text-[#F5D76E] sm:size-7"
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
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547] text-base font-black text-white shadow disabled:opacity-40 sm:size-9"
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
                          "rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-wider sm:text-[10px]",
                          autoSpin
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#450a0a]"
                            : "border-[#E8C547]/80 bg-[#2e1065] text-[#F5D76E]",
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
                  Instantly trigger Free Spins ({engineCfg.freeSpinsBaseCount} base +
                  {engineCfg.freeSpinsExtraPerScatter} per extra scatter) with progressive cascade
                  multipliers (
                  {engineCfg.freeSpinsCascadeMultipliers.map((m) => `×${m}`).join(" → ")}).
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

      <PaytableModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
