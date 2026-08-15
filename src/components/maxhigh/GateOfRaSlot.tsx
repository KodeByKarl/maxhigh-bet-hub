/**
 * Gate of Ra — 6×5 ways cascading slot (Godly Gates-style cascade).
 * Engine resolves on the server; this file plays back the animation script.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import {
  getGateOfRaSessionFn,
  gateOfRaBuyFeatureFn,
  gateOfRaFreeSpinFn,
  gateOfRaSpinFn,
} from "@/functions/api";
import { ANIM, EASE, columnDominoMs } from "./gate-of-ra/animationConfig";
import { gateOfRaAudio, GATE_OF_RA_SOUND_FILES } from "./gate-of-ra/audio";
import { AudioLoadBar } from "./gate-of-ra/AudioLoadBar";
import { ControlBar } from "./gate-of-ra/ControlBar";
import { FreeSpinsBadge } from "./gate-of-ra/FreeSpinsBadge";
import { FreeSpinIntro, ScatterGatherOverlay } from "./gate-of-ra/FreeSpinIntro";
import { GateOfRaSidePanel } from "./gate-of-ra/GateOfRaSidePanel";
import { buildBoard, initialBoard, nextKey } from "./gate-of-ra/gridState";
import { ASSET, getBuyFeatureMult } from "./gate-of-ra/paytable";
import { getRuntimeSymbols, setGateOfRaConfig } from "./gate-of-ra/runtimeConfig";
import type { BoardCell, SpinScript, WayWin } from "./gate-of-ra/types";
import { COLS, ROWS } from "./gate-of-ra/types";
import { SymbolIcon } from "./gate-of-ra/SymbolIcon";
import { WaysWinOverlay } from "./gate-of-ra/WaysWinOverlay";
import { WinCelebration } from "./gate-of-ra/WinCelebration";
import { PharaohMascot, type MascotMood } from "./gate-of-ra/PharaohMascot";
import { GATE_OF_RA_GAME_ID } from "@/lib/gate-of-ra-config";

type Phase = "idle" | "dropping" | "glow" | "popping" | "falling" | "scatter";
type Slot = BoardCell | null;

function asSlots(board: BoardCell[]): Slot[] {
  const slots: Slot[] = Array.from({ length: COLS * ROWS }, () => null);
  for (let i = 0; i < Math.min(board.length, slots.length); i++) slots[i] = board[i];
  return slots;
}

function rAFWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (now - start >= ms) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function GateOfRaSlot({
  gameId = "gate-of-ra",
  gameName = "Gate of Ra",
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal, refreshJackpot } = useAuth();
  const balance = user?.balance ?? 0;
  const playSessionIdRef = useRef<string | null>(null);
  const [bet, setBet] = useState(1);
  const [slots, setSlots] = useState<Slot[]>(() => asSlots(initialBoard()));
  const [phase, setPhase] = useState<Phase>("idle");
  const [winningKeys, setWinningKeys] = useState<Set<string>>(new Set());
  const [spawnedKeys, setSpawnedKeys] = useState<Set<string>>(new Set());
  const [fallenKeys, setFallenKeys] = useState<Set<string>>(new Set());
  const [fallDistance, setFallDistance] = useState<Record<string, number>>({});
  const [animTick, setAnimTick] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [muted, setMuted] = useState(() => gateOfRaAudio.isMuted);
  const [lastWin, setLastWin] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [inFree, setInFree] = useState(false);
  const [fsMult, setFsMult] = useState(1);
  const [fsSessionWin, setFsSessionWin] = useState(0);
  const [dropTotal, setDropTotal] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<{ amount: number; multiplier: number } | null>(null);
  const [fsSummary, setFsSummary] = useState<{
    amount: number;
    baseEarn: number;
    multiplier: number;
  } | null>(null);
  const [mascotMood, setMascotMood] = useState<MascotMood>("idle");
  const [mascotPulse, setMascotPulse] = useState(0);
  const [overlayWays, setOverlayWays] = useState<WayWin[]>([]);
  const [overlayMult, setOverlayMult] = useState(1);
  const [showPaytable, setShowPaytable] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(0);
  const [audioTotal, setAudioTotal] = useState(() => Object.keys(GATE_OF_RA_SOUND_FILES).length);
  const [fsIntroSpins, setFsIntroSpins] = useState<number | null>(null);
  const [scatterPoints, setScatterPoints] = useState<
    { x: number; y: number; key: string }[] | null
  >(null);

  const busy = phase !== "idle";
  const busyRef = useRef(false);
  const freeSpinsRef = useRef(0);
  const fsSessionRef = useRef(0);
  const fsMultRef = useRef(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const turboRef = useRef(turbo);
  turboRef.current = turbo;

  freeSpinsRef.current = freeSpins;
  fsSessionRef.current = fsSessionWin;
  fsMultRef.current = fsMult;

  useEffect(() => {
    let alive = true;
    void gateOfRaAudio
      .preload((loaded, total) => {
        if (!alive) return;
        setAudioLoaded(loaded);
        setAudioTotal(total);
      })
      .finally(() => {
        if (!alive) return;
        // Always dismiss the bar when preload settles (even if some files failed).
        const total = Object.keys(GATE_OF_RA_SOUND_FILES).length;
        setAudioTotal(total);
        setAudioLoaded(total);
      });
    return () => {
      alive = false;
      gateOfRaAudio.stopAmbient();
    };
  }, []);



  const wait = (ms: number) => rAFWait(turboRef.current ? Math.round(ms * 0.45) : ms);

  /** Staggered reel-stop thunks left→right during column land. */
  const playColumnStops = (cols: number) => {
    const factor = turboRef.current ? 0.45 : 1;
    for (let c = 0; c < cols; c++) {
      const delay = (c * ANIM.dropStaggerCol + ANIM.dropDuration * 0.72) * factor;
      window.setTimeout(() => gateOfRaAudio.playReelStop(c), delay);
    }
  };

  const gatherScatters = async (board: BoardCell[]) => {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    const points = board
      .map((cell, i) => ({ cell, i }))
      .filter(({ cell }) => cell.sym.scatter)
      .map(({ cell, i }) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return {
          key: cell.key,
          x: col * cellW + cellW / 2,
          y: row * cellH + cellH / 2,
        };
      });
    if (points.length < 3) return;

    setPhase("scatter");
    setScatterPoints(points);
    gateOfRaAudio.playScatterTrigger();
    await wait(ANIM.scatterGather + ANIM.scatterFlash);
    setScatterPoints(null);
  };

  const playScript = useCallback(async (script: SpinScript, isFree: boolean) => {
    if (isFree) {
      fsMultRef.current = script.endMultiplier;
      setFsMult(script.endMultiplier);
    }

    setDropTotal(0);
    setWinningKeys(new Set());
    setSpawnedKeys(new Set());
    setFallenKeys(new Set());
    setFallDistance({});

    setMascotMood("spin");
    setMascotPulse((n) => n + 1);
    setPhase("dropping");
    setSlots(asSlots(script.initialBoard));
    setAnimTick((t) => t + 1);
    gateOfRaAudio.startSpinLoop();
    playColumnStops(COLS);
    await wait(columnDominoMs(COLS));
    gateOfRaAudio.stopSpinLoop();

    let running = 0;

    for (const step of script.steps) {
      setSlots(asSlots(step.board));
      setWinningKeys(new Set(step.winningKeys));
      setOverlayWays(step.ways);
      setOverlayMult(step.multiplier);
      running += step.cascadeWin;
      setDropTotal(running);
      if (step.cascadeWin > 0) {
        setMascotMood("win");
        setMascotPulse((n) => n + 1);
        gateOfRaAudio.playCascadeTick();
      }
      if (isFree && running > 0) {
        setLastWin(+(fsSessionRef.current + running).toFixed(2));
      }
      setPhase("glow");
      await wait(ANIM.glowDuration);

      setPhase("popping");
      setOverlayWays([]);
      await wait(ANIM.popDuration);
      setSlots(step.afterPop.length === COLS * ROWS ? step.afterPop : asSlots(step.board));
      setWinningKeys(new Set());
      await wait(60);

      setSpawnedKeys(new Set(step.spawnedKeys));
      setFallenKeys(new Set(step.fallenKeys));
      setFallDistance(step.fallDistance ?? {});
      setSlots(asSlots(step.afterFall));
      setAnimTick((t) => t + 1);
      setPhase("falling");
      playColumnStops(COLS);
      gateOfRaAudio.playCascadeTick();
      await wait(columnDominoMs(COLS));

      setSpawnedKeys(new Set());
      setFallenKeys(new Set());
      setFallDistance({});
      await wait(ANIM.betweenCascades);
    }

    if (script.freeSpinsAwarded > 0 && !isFree) {
      const settleBoard =
        script.steps.length > 0
          ? script.steps[script.steps.length - 1].afterFall
          : script.initialBoard;
      await gatherScatters(settleBoard);
    }

    setMascotMood(script.totalWin > 0 || script.freeSpinsAwarded > 0 ? "celebrate" : "idle");
    setMascotPulse((n) => n + 1);
    setPhase("idle");
    setSpawnedKeys(new Set());
    setFallenKeys(new Set());
    setFallDistance({});
    return script;
  }, []);

  const showTotalWin = (amount: number, multiplier = 1) => {
    if (amount <= 0) return;
    gateOfRaAudio.playWin(amount, bet);
    setWinPopup({ amount, multiplier });
    window.setTimeout(() => setWinPopup(null), ANIM.bannerHold + 1400);
  };

  const applySession = (session: {
    sessionId: string | null;
    freeSpinsLeft: number;
    fsSessionWin: number;
    fsMult: number;
    fsSpinsPlayed: number;
    inFree: boolean;
  }) => {
    playSessionIdRef.current = session.sessionId;
    setInFree(session.inFree);
    setFreeSpins(session.freeSpinsLeft);
    setFsMult(session.fsMult);
    setFsSessionWin(session.fsSessionWin);
    freeSpinsRef.current = session.freeSpinsLeft;
    fsMultRef.current = session.fsMult;
    fsSessionRef.current = session.fsSessionWin;
  };

  const finishBase = async (
    script: SpinScript,
    session: { sessionId: string | null; freeSpinsLeft: number; inFree: boolean },
  ) => {
    if (script.totalWin > 0) {
      setLastWin(script.totalWin);
      setTotalWin((t) => +(t + script.totalWin).toFixed(2));
    } else {
      setLastWin(0);
    }

    if (session.inFree && session.freeSpinsLeft > 0) {
      gateOfRaAudio.playFreespinIntro();
      setFsIntroSpins(session.freeSpinsLeft);
      applySession({
        sessionId: session.sessionId,
        freeSpinsLeft: session.freeSpinsLeft,
        fsSessionWin: 0,
        fsMult: 1,
        fsSpinsPlayed: 0,
        inFree: true,
      });
      setLastWin(0);
      await wait(ANIM.freespinIntroHold);
      setFsIntroSpins(null);
    } else if (script.totalWin > 0) {
      showTotalWin(script.totalWin, script.displayMult);
    }
  };

  const spin = async (asFree = false) => {
    if (busyRef.current) return;
    const isFree = asFree || (inFree && freeSpins > 0);
    const cost = isFree ? 0 : bet;

    if (!isFree && balance < cost) {
      toast.error("Insufficient balance");
      setAutoSpin(false);
      return;
    }

    busyRef.current = true;
    setBanner(null);
    setWinPopup(null);
    setFsIntroSpins(null);

    try {
      let settled: Awaited<ReturnType<typeof gateOfRaSpinFn>>;
      if (isFree) {
        const sessionId = playSessionIdRef.current;
        if (!sessionId) {
          toast.error("Free spin session expired — refresh and try again");
          setAutoSpin(false);
          return;
        }
        settled = await gateOfRaFreeSpinFn({ data: { sessionId } });
      } else {
        settled = await gateOfRaSpinFn({ data: { bet } });
        setDropTotal(0);
        fsMultRef.current = 1;
        setFsMult(1);
      }

      setBalanceLocal(settled.balance);
      void refreshJackpot();
      applySession(settled.session);

      const script = await playScript(settled.script, isFree);

      if (isFree) {
        setFsSessionWin(settled.session.fsSessionWin);
        setFsMult(settled.session.fsMult);
        setLastWin(settled.session.fsSessionWin || settled.fsPayout?.amount || 0);
        fsSessionRef.current = settled.session.fsSessionWin;
        fsMultRef.current = settled.session.fsMult;
        if (script.totalWin > 0) gateOfRaAudio.playWin(script.totalWin, bet);

        if (script.retriggerSpins > 0 && settled.session.inFree) {
          gateOfRaAudio.playScatterTrigger();
          setBanner(`+${script.retriggerSpins} FREE SPINS!`);
          window.setTimeout(() => setBanner(null), 1400);
        }

        if (settled.fsPayout) {
          setInFree(false);
          setFreeSpins(0);
          freeSpinsRef.current = 0;
          gateOfRaAudio.endFreespins();
          setLastWin(settled.fsPayout.amount);
          if (settled.fsPayout.amount > 0) {
            setTotalWin((t) => +(t + settled.fsPayout!.amount).toFixed(2));
            gateOfRaAudio.playWin(settled.fsPayout.amount, bet);
          }
          setFsSummary({
            amount: settled.fsPayout.amount,
            baseEarn: settled.fsPayout.baseEarn,
            multiplier: settled.fsPayout.multiplier,
          });
          setFsMult(1);
          setFsSessionWin(0);
          fsMultRef.current = 1;
          fsSessionRef.current = 0;
        }
      } else {
        await finishBase(script, settled.session);
      }
    } catch (err) {
      console.error("[GateOfRa] spin failed", err);
      toast.error(err instanceof Error ? err.message : "Spin failed — try again");
      setAutoSpin(false);
    } finally {
      busyRef.current = false;
      setPhase("idle");
    }
  };

  const buyFeature = async () => {
    if (busyRef.current || phase !== "idle" || inFree) return;
    const cost = +(bet * getBuyFeatureMult()).toFixed(2);
    if (balance < cost) {
      toast.error("Insufficient balance");
      return;
    }

    busyRef.current = true;
    try {
      const bought = await gateOfRaBuyFeatureFn({ data: { bet } });
      setBalanceLocal(bought.balance);
      void refreshJackpot();
      applySession(bought.session);

      const seeded = buildBoard({ freeSpins: true, seedWin: false });
      const indices = Array.from({ length: 30 }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let k = 0; k < 3; k++) {
        seeded[indices[k]] = {
          key: nextKey(),
          sym: getRuntimeSymbols().find((s) => s.scatter)!,
        };
      }
      setSlots(asSlots(seeded));
      await gatherScatters(seeded);
      gateOfRaAudio.playFreespinIntro();
      setFsIntroSpins(bought.awarded);
      await wait(ANIM.freespinIntroHold);
      setFsIntroSpins(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Buy feature failed");
      busyRef.current = false;
      setPhase("idle");
      return;
    } finally {
      busyRef.current = false;
      setPhase("idle");
    }
    await spin(true);
  };

  useEffect(() => {
    void getGateOfRaSessionFn()
      .then((session) => {
        if (!session.sessionId) return;
        applySession(session);
        if (session.bet > 0) setBet(session.bet);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (busyRef.current || busy) return;
    if (winPopup || fsSummary || fsIntroSpins != null) return;
    if (inFree && freeSpins > 0) {
      const t = window.setTimeout(() => void spin(true), turbo ? 350 : 700);
      return () => clearTimeout(t);
    }
    if (autoSpin && !inFree) {
      const t = window.setTimeout(() => void spin(false), turbo ? 350 : 700);
      return () => clearTimeout(t);
    }
  }, [autoSpin, inFree, freeSpins, busy, turbo, winPopup, fsSummary, fsIntroSpins]);

  const buyCost = +(bet * getBuyFeatureMult()).toFixed(2);
  const waysLabel = (ROWS ** COLS).toLocaleString();
  const glowMs = (turbo ? ANIM.glowDuration * 0.45 : ANIM.glowDuration) / 1000;
  const dropMs = (turbo ? ANIM.dropDuration * 0.45 : ANIM.dropDuration) / 1000;
  const popMs = (turbo ? ANIM.popDuration * 0.45 : ANIM.popDuration) / 1000;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none">
      <img
        src={ASSET.backdrop}
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
        decoding="async"
        fetchPriority="high"
      />
      {/* Desert dusk wash + vignette — full viewport, no bottom cut */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1c0a00]/90 via-[#78350f]/25 to-[#0c4a6e]/30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(28,10,0,0.72)_100%)]" />

      <AudioLoadBar loaded={audioLoaded} total={audioTotal} />

      {/* Candy Peak–style stage: fill viewport, 3-column rails */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1600px] flex-col items-center gap-1.5 sm:gap-2">
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-2 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
            {/* LEFT RAIL — features (Candy Peak format) */}
            <div className="hidden h-full min-w-0 items-center justify-end sm:flex">
              <div className="flex w-full flex-col items-stretch justify-center gap-2.5">
                {inFree ? (
                  <>
                    <div
                      className="w-full rounded-2xl border-[3px] border-amber-300 px-2 py-2.5 text-center"
                      style={{
                        background: "linear-gradient(180deg,#92400e,#451a03 70%,#1c0a00)",
                        boxShadow:
                          "inset 0 1px 0 rgba(253,230,138,0.35), 0 8px 20px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                        Multiplier
                      </div>
                      <div className="font-black text-2xl text-amber-300 tabular-nums">{fsMult}x</div>
                    </div>
                    <div
                      className="w-full rounded-2xl border-[3px] border-amber-500/70 px-2 py-2.5 text-center"
                      style={{
                        background: "linear-gradient(180deg,#78350f,#3b1a05 70%,#1c0a00)",
                        boxShadow:
                          "inset 0 1px 0 rgba(253,230,138,0.25), 0 8px 20px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100">
                        Session
                      </div>
                      <div className="font-black text-base text-amber-300 tabular-nums">
                        {formatMoney(fsSessionWin)}
                      </div>
                    </div>
                    <FreeSpinsBadge count={freeSpins} className="w-full" />
                  </>
                ) : (
                  <GateOfRaSidePanel
                    buyCost={buyCost}
                    bet={bet}
                    busy={busy}
                    onBuy={() => void buyFeature()}
                  />
                )}
              </div>
            </div>

            {/* CENTER COLUMN — balanced reels */}
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 w-full max-w-full flex-col items-center"
                style={{
                  width: `min(100%, calc(82dvh * ${COLS} / ${ROWS}))`,
                }}
              >
                {/* Temple title plaque */}
                <div className="relative z-20 shrink-0 px-2 text-center">
                  <div
                    className="mx-auto mb-0.5 h-1 w-36 rounded-full sm:w-48"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, #fbbf24 20%, #fef3c7 50%, #fbbf24 80%, transparent)",
                    }}
                  />
                  <h1
                    className="select-none font-black leading-none tracking-[0.08em] text-[clamp(1.5rem,5vw,2.75rem)]"
                    style={{
                      color: "#fef3c7",
                      textShadow:
                        "0 2px 0 #78350f, 0 4px 0 #451a03, 0 0 22px rgba(251,191,36,0.8), 0 0 2px #000",
                      WebkitTextStroke: "1px rgba(120,53,15,0.65)",
                    }}
                  >
                    GODLY GATES
                  </h1>
                  <div
                    className="mx-auto mt-0.5 h-1 w-36 rounded-full sm:w-48"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, #fbbf24 20%, #fef3c7 50%, #fbbf24 80%, transparent)",
                    }}
                  />
                </div>

                <div
                  className="relative z-20 mb-1 mt-1 shrink-0 rounded-md border-2 border-amber-200 px-4 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-50 shadow-lg sm:text-[12px]"
                  style={{
                    background: "linear-gradient(180deg,#a16207,#78350f 45%,#451a03)",
                    boxShadow: "inset 0 1px 0 rgba(253,230,138,0.4)",
                  }}
                >
                  {waysLabel} WAYS
                  {inFree ? ` · FREE ×${freeSpins}` : ""}
                </div>

                {/* Mobile buy / FS chips */}
                <div className="mb-1 flex shrink-0 flex-wrap items-center justify-center gap-2 sm:hidden">
                  {inFree ? (
                    <FreeSpinsBadge count={freeSpins} />
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void buyFeature()}
                      className="rounded-md border-2 border-amber-100 px-3 py-1.5 text-center disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(180deg,#fef3c7 0%,#fbbf24 35%,#d97706 70%,#92400e 100%)",
                      }}
                    >
                      <span className="text-[10px] font-black uppercase text-amber-950">
                        Buy {formatMoneyCompact(buyCost)}
                      </span>
                    </button>
                  )}
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
                    {dropTotal > 0 &&
                      (phase === "glow" || phase === "popping" || phase === "falling") && (
                        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                          <div
                            className="rounded-md border-2 border-amber-200 px-4 py-1.5 text-center"
                            style={{
                              background: "linear-gradient(180deg,#92400e,#451a03)",
                              boxShadow: "0 0 22px rgba(251,191,36,0.55)",
                            }}
                          >
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                              Cascade Win
                            </div>
                            <div className="font-black text-lg leading-none text-amber-300 tabular-nums">
                              {formatMoney(dropTotal)}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Golden temple reel frame */}
                    <div
                      className="relative size-full rounded-[1rem] p-[7px] shadow-[0_22px_55px_rgba(69,26,3,0.65)] sm:rounded-[1.15rem] sm:p-[10px]"
                      style={{
                        background:
                          "linear-gradient(160deg, #fef3c7 0%, #fbbf24 18%, #b45309 42%, #78350f 68%, #fde68a 88%, #92400e 100%)",
                      }}
                    >
                      {(["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"] as const).map(
                        (pos) => (
                          <span
                            key={pos}
                            className={`pointer-events-none absolute z-[2] text-[10px] font-black text-amber-950/70 ${pos}`}
                          >
                            ✦
                          </span>
                        ),
                      )}
                      <div
                        className="relative size-full overflow-hidden rounded-[0.65rem] border-2 border-amber-950/55 sm:rounded-[0.85rem]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(69,26,3,0.94) 0%, rgba(28,10,0,0.96) 100%)",
                          boxShadow: "inset 0 0 40px rgba(0,0,0,0.45)",
                        }}
                      >
                <div
                  ref={gridRef}
                  className={cn(
                    "relative grid size-full gap-1.5 p-2 sm:gap-2 sm:p-2.5",
                    phase === "dropping" || phase === "falling"
                      ? "overflow-visible"
                      : "overflow-hidden",
                  )}
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                  }}
                >
                  {slots.map((cell, i) => {
                    const col = i % COLS;
                    const row = Math.floor(i / COLS);
                    const key = cell?.key ?? `empty-${i}-${animTick}`;
                    const winning = cell ? winningKeys.has(cell.key) : false;
                    const spawned = cell ? spawnedKeys.has(cell.key) : false;
                    const fallen = cell ? fallenKeys.has(cell.key) : false;
                    const fallDist = cell ? (fallDistance[cell.key] ?? 0) : 0;
                    const isDropping = phase === "dropping";
                    const isFalling = phase === "falling";
                    const colDelaySec =
                      (col * ANIM.dropStaggerCol + row * ANIM.dropStaggerRow) / 1000;
                    const dropDelay = turbo ? colDelaySec * 0.45 : colDelaySec;
                    const isInitialDrop = isDropping && !!cell;
                    const isGravityDrop =
                      isFalling && !!cell && (spawned || fallen) && fallDist > 0;
                    const shouldDropIn = isInitialDrop || isGravityDrop;
                    const isGlow = phase === "glow" && winning;
                    const isPop = phase === "popping" && winning;
                    // Start well ABOVE the reel frame so symbols enter from outside the gold rim.
                    const dropRows = isInitialDrop
                      ? row + ROWS + 2.25
                      : Math.max(fallDist, row + ROWS + 2);
                    const dropFrom = `${-dropRows * 100}%`;
                    const motionKey = shouldDropIn ? `${key}-${phase}-${animTick}` : key;

                    return (
                      <div
                        key={`slot-${i}`}
                        className={cn(
                          "relative size-full min-h-0 min-w-0 rounded-md",
                          shouldDropIn || isGlow ? "overflow-visible z-[2]" : "overflow-hidden",
                          isGlow &&
                            "ring-2 ring-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.95)]",
                        )}
                      >
                        {cell && (
                          <motion.div
                            key={motionKey}
                            initial={
                              shouldDropIn
                                ? {
                                    y: dropFrom,
                                    opacity: 0,
                                    scale: isInitialDrop || spawned ? 0.9 : 0.96,
                                  }
                                : false
                            }
                            animate={
                              isPop
                                ? { scale: 0, opacity: 0, y: 8 }
                                : isGlow
                                  ? {
                                      scale: [1, 1.15, 1],
                                      opacity: 1,
                                      y: 0,
                                    }
                                  : {
                                      y: 0,
                                      opacity: 1,
                                      scale: 1,
                                    }
                            }
                            transition={
                              shouldDropIn
                                ? {
                                    y: {
                                      duration: dropMs,
                                      delay: dropDelay,
                                      ease: isFalling ? EASE.bounceLand : EASE.reelStop,
                                    },
                                    opacity: {
                                      duration: Math.max(0.12, dropMs * 0.22),
                                      delay: dropDelay,
                                      ease: EASE.softOut,
                                    },
                                    scale: {
                                      duration: dropMs,
                                      delay: dropDelay,
                                      ease: isFalling ? EASE.bounceLand : EASE.reelStop,
                                    },
                                  }
                                : isPop
                                  ? {
                                      duration: popMs,
                                      delay:
                                        col * (ANIM.popStagger / 1000) * (turbo ? 0.45 : 1),
                                      ease: EASE.softOut,
                                    }
                                  : isGlow
                                    ? {
                                        duration: glowMs,
                                        ease: EASE.glowPulse,
                                        times: [0, 0.45, 1],
                                      }
                                    : { duration: turbo ? 0.12 : 0.22, ease: EASE.softOut }
                            }
                            className="absolute inset-[6%] flex items-center justify-center will-change-transform sm:inset-[7%]"
                          >
                            <SymbolIcon kind={cell.sym.kind} className="size-full" />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {phase === "glow" && overlayWays.length > 0 && (
                    <WaysWinOverlay ways={overlayWays} multiplier={overlayMult} />
                  )}
                </AnimatePresence>

                {scatterPoints && gridRef.current && (
                  <ScatterGatherOverlay
                    points={scatterPoints}
                    gridW={gridRef.current.clientWidth}
                    gridH={gridRef.current.clientHeight}
                  />
                )}
                      </div>
                    </div>
                  </div>
                </div>

          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-1 shrink-0 rounded-md border-2 border-amber-200 px-5 py-2 text-sm font-black uppercase tracking-widest text-amber-100"
                style={{
                  background: "linear-gradient(180deg,#a16207,#78350f 45%,#451a03)",
                  boxShadow: "inset 0 1px 0 rgba(253,230,138,0.4), 0 8px 20px rgba(0,0,0,0.35)",
                }}
              >
                {banner}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto w-full shrink-0 pt-1.5">
            <ControlBar
              balance={balance}
              bet={bet}
              win={lastWin}
              busy={busy}
              inFree={inFree}
              turbo={turbo}
              autoSpin={autoSpin}
              muted={muted}
              onBetChange={setBet}
              onTurbo={() => setTurbo((t) => !t)}
              onAuto={() => setAutoSpin((a) => !a)}
              onSpin={() => void spin(false)}
              onMuteToggle={() => {
                const next = gateOfRaAudio.toggleMute();
                setMuted(next);
              }}
              onOpenInfo={() => setShowPaytable(true)}
              onOpenSettings={() =>
                toast.message("Settings", {
                  description: "Use Mute / Turbo / Auto on the control bar.",
                })
              }
            />
          </div>
              </div>
            </div>

            {/* RIGHT RAIL — equal spacer keeps reels centered (Candy Peak) */}
            <div className="relative hidden h-full min-w-0 sm:block" aria-hidden>
              <PharaohMascot
                mood={mascotMood}
                pulse={mascotPulse}
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex h-[min(560px,78vh)] items-end justify-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile mascot peek */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-[5] h-40 w-28 overflow-hidden sm:hidden">
        <PharaohMascot
          mood={mascotMood}
          pulse={mascotPulse}
          className="absolute bottom-0 right-[-20%] flex h-52 items-end"
        />
      </div>

      <AnimatePresence>
        {fsIntroSpins != null && (
          <FreeSpinIntro key="fs-intro" spins={fsIntroSpins} onDone={() => setFsIntroSpins(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaytable && (
          <motion.button
            type="button"
            aria-label="Close paytable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#1c0a00]/70 p-4 backdrop-blur-sm"
            onClick={() => setShowPaytable(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="max-h-[80vh] w-full max-w-md overflow-auto rounded-[1.1rem] p-[3px] text-left shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, #fef3c7 0%, #fbbf24 22%, #b45309 50%, #fde68a 78%, #92400e 100%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-[0.95rem] border border-amber-950/70 p-4"
                style={{
                  background: "linear-gradient(180deg, #a16207 0%, #78350f 18%, #451a03 55%, #1c0a00 100%)",
                }}
              >
                <div
                  className="mb-1 h-1 w-full rounded-full opacity-80"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,#fbbf24 0 10px,#78350f 10px 14px,#fde68a 14px 22px,#451a03 22px 26px)",
                  }}
                />
                <div className="mb-3 text-center text-lg font-black tracking-[0.12em] text-amber-100">
                  {gameName} · Paytable
                </div>
                <div className="space-y-2">
                  {getRuntimeSymbols()
                    .filter((s) => !s.wild && !s.scatter)
                    .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border border-amber-700/50 px-2 py-1.5"
                      style={{
                        background: "linear-gradient(180deg, rgba(69,26,3,0.85), rgba(28,10,0,0.9))",
                      }}
                    >
                      <div className="size-10 shrink-0">
                        <SymbolIcon kind={s.kind} className="size-full" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs text-amber-100/90">
                        <div className="font-bold capitalize text-amber-200">{s.kind}</div>
                        <div className="tabular-nums text-amber-200/60">
                          3×{s.pay[0]} · 4×{s.pay[1]} · 5×{s.pay[2]} · 6×{s.pay[3]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-amber-200/60">
                  Ways pays · Tap outside to close
                </p>
              </div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winPopup && (
          <WinCelebration
            amount={winPopup.amount}
            bet={bet}
            multiplier={winPopup.multiplier}
            onDismiss={() => setWinPopup(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fsSummary && (
          <WinCelebration
            amount={fsSummary.amount}
            bet={bet}
            multiplier={fsSummary.multiplier}
            onDismiss={() => setFsSummary(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
