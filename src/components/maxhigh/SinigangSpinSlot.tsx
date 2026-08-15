/**
 * Sinigang Spin — fixed-payline slot UI.
 * Server resolves outcomes; this component plays back the spin script.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FastForward, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import {
  SINIGANG_SPIN_GAME_ID,
  SYMBOL_NAMES,
  type CnySymKind,
} from "@/lib/sinigang-spin-config";
import { getSinigangSpinEngineConfigFn } from "@/functions/superadmin";
import {
  sinigangSpinCollectFn,
  sinigangSpinGambleFn,
  sinigangSpinSpinFn,
  getSinigangSpinSessionFn,
} from "@/functions/api";
import { ANIM } from "./sinigang-spin/animationConfig";
import { sinigangSpinAudio } from "./sinigang-spin/audio";
import { ICON_SRC, BET_STEPS } from "./sinigang-spin/paytable";
import { BetSelectModal } from "./sinigang-spin/BetSelectModal";
import { getSinigangSpinConfig, setSinigangSpinConfig } from "./sinigang-spin/runtimeConfig";
import { PaytableModal } from "./sinigang-spin/PaytableModal";
import { ReelCell, type ReelPhase } from "./sinigang-spin/ReelCell";
import { WinCelebration } from "./sinigang-spin/WinCelebration";
import type { CnyGrid, GambleChoice, SpinScript } from "./sinigang-spin/types";
import { cellKey } from "./sinigang-spin/types";

const EMPTY_SET = new Set<string>();

function idleGrid(): CnyGrid {
  const cfg = getSinigangSpinConfig();
  const kinds: CnySymKind[] = ["lantern", "lion", "fish", "coins", "jug", "sym_a", "sym_k", "sym_q"];
  return Array.from({ length: cfg.reelsCount }, (_, r) =>
    Array.from({ length: cfg.rowsCount }, (_, row) => kinds[(r + row * 2) % kinds.length]!),
  );
}

function preloadAssets() {
  if (typeof Image === "undefined") return;
  for (const src of Object.values(ICON_SRC)) {
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

export function SinigangSpinSlot({
  gameId = SINIGANG_SPIN_GAME_ID,
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(5);
  const [grid, setGrid] = useState<CnyGrid>(() => idleGrid());
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [winningKeys, setWinningKeys] = useState<Set<string>>(EMPTY_SET);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [betPickerOpen, setBetPickerOpen] = useState(false);
  const [dragonOverlay, setDragonOverlay] = useState<{
    launch: number;
    total: number;
    label: string;
  } | null>(null);
  const [monkeyOverlay, setMonkeyOverlay] = useState<{
    extra: CnySymKind;
    spins: number;
  } | null>(null);
  const [gambleOpen, setGambleOpen] = useState(false);
  const [pendingWin, setPendingWin] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fsProgress, setFsProgress] = useState<string | null>(null);
  const [extraScatter, setExtraScatter] = useState<CnySymKind | null>(null);
  const [spinId, setSpinId] = useState(0);

  const busy = phase !== "idle" || gambleOpen;
  const busyRef = useRef(false);
  const turboRef = useRef(turbo);
  const autoRef = useRef(autoSpin);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const spinRef = useRef<() => Promise<void>>(async () => undefined);

  turboRef.current = turbo;
  autoRef.current = autoSpin;

  const wait = useCallback((ms: number, gen: number) => {
    const scaled = turboRef.current ? Math.min(ms, 55) : ms;
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
    sinigangSpinAudio.preload();
    preloadAssets();
    void getSinigangSpinEngineConfigFn()
      .then((cfg) => {
        if (mountedRef.current) {
          setSinigangSpinConfig(cfg);
          setGrid(idleGrid());
        }
      })
      .catch(() => undefined);
    void getSinigangSpinSessionFn()
      .then((s) => {
        if (!mountedRef.current) return;
        if (s.sessionId && s.pendingWin > 0) {
          setSessionId(s.sessionId);
          setPendingWin(s.pendingWin);
          setGambleOpen(true);
        }
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      sinigangSpinAudio.stopAmbient();
    };
  }, []);

  const playScript = useCallback(
    async (script: SpinScript, gen: number) => {
      const cfg = getSinigangSpinConfig();
      setWinningKeys(EMPTY_SET);
      setWinPopup(null);
      setDragonOverlay(null);
      setMonkeyOverlay(null);
      setFsProgress(null);
      setExtraScatter(null);
      setSpinId((n) => n + 1);
      setPhase("spinning");
      sinigangSpinAudio.unlock();
      sinigangSpinAudio.startSpinLoop();

      // Spin blur, then reveal final grid with staggered drop-stop
      await wait(ANIM.reelSpin, gen);
      sinigangSpinAudio.playReelStop();
      setGrid(script.grid);
      setPhase("stopping");
      await wait(ANIM.reelStagger * (cfg.reelsCount - 1) + ANIM.reelSettle, gen);

      // Payline highlights
      if (script.paylineWins.length > 0) {
        const keys = new Set<string>();
        for (const w of script.paylineWins) {
          for (const [reel, row] of w.positions) keys.add(cellKey(reel, row));
        }
        setWinningKeys(keys);
        setPhase("win");
        setWinPopup(script.paylineWin);
        sinigangSpinAudio.playWin();
        await wait(ANIM.lineHighlight, gen);
      }

      // Dragon Fireworks
      if (script.dragonBonus?.triggered) {
        setBanner("Dragon Fireworks!");
        let running = 0;
        for (const launch of script.dragonBonus.launches) {
          if (launch.success) {
            running += launch.coins;
            sinigangSpinAudio.playDragonFirework();
            setDragonOverlay({
              launch: launch.index + 1,
              total: running,
              label: launch.awardLabel ?? "Coins",
            });
            await wait(ANIM.dragonLaunch, gen);
          } else {
            sinigangSpinAudio.playDragonBust();
            setDragonOverlay({ launch: launch.index + 1, total: running, label: "BUST!" });
            await wait(ANIM.dragonBust, gen);
          }
        }
        setDragonOverlay(null);
        setBanner(null);
      }

      // Monkey Free Spins intro
      if (script.monkeyBonus?.triggered) {
        sinigangSpinAudio.playMonkeyTrigger();
        setMonkeyOverlay({
          extra: script.monkeyBonus.extraScatterSymbol,
          spins: script.monkeyBonus.freeSpinsAwarded,
        });
        setBanner(`Monkey! +${formatMoney(script.monkeyBonus.triggerPayout)}`);
        setExtraScatter(script.monkeyBonus.extraScatterSymbol);
        await wait(ANIM.monkeyIntro + ANIM.wheelSpin, gen);
        setMonkeyOverlay(null);
        setBanner(null);

        for (const fs of script.freeSpins) {
          setFsProgress(`Free Spin ${fs.spinIndex + 1}/${script.freeSpins.length}`);
          setSpinId((n) => n + 1);
          setPhase("spinning");
          sinigangSpinAudio.startSpinLoop();
          await wait(ANIM.reelSpin * 0.65, gen);
          sinigangSpinAudio.playReelStop();
          setGrid(fs.grid);
          setPhase("stopping");
          await wait(ANIM.reelStagger * (cfg.reelsCount - 1) + ANIM.reelSettle * 0.75, gen);
          const keys = new Set<string>();
          for (const w of fs.paylineWins) {
            for (const [reel, row] of w.positions) keys.add(cellKey(reel, row));
          }
          setWinningKeys(keys);
          if (fs.spinWin > 0) {
            setPhase("win");
            setWinPopup(fs.spinWin);
            sinigangSpinAudio.playWin();
          }
          await wait(ANIM.freeSpinGap + (fs.spinWin > 0 ? ANIM.lineHighlight : 200), gen);
        }
        setFsProgress(null);
        setExtraScatter(null);
      }

      setLastWin(script.totalWin);
      if (script.totalWin > 0) {
        setWinPopup(script.totalWin);
        await wait(ANIM.winTally, gen);
      }
      setWinningKeys(EMPTY_SET);
      setWinPopup(null);
      setPhase("idle");
    },
    [wait],
  );

  const doSpin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const gen = ++playbackGen.current;
    try {
      // Autoplay always auto-collects (declines gamble by default)
      const res = await sinigangSpinSpinFn({
        data: { bet, autoCollect: autoRef.current },
      });
      setBalanceLocal(res.balance);
      await playScript(res.script, gen);
      if (!res.collected && res.session.sessionId && res.session.pendingWin > 0) {
        setSessionId(res.session.sessionId);
        setPendingWin(res.session.pendingWin);
        setGambleOpen(true);
        setAutoSpin(false);
      } else if (autoRef.current) {
        // continue autoplay
        busyRef.current = false;
        setTimeout(() => {
          if (mountedRef.current && autoRef.current) void spinRef.current();
        }, turboRef.current ? 80 : 350);
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Spin failed";
      toast.error(msg);
      setPhase("idle");
      setAutoSpin(false);
    } finally {
      busyRef.current = false;
    }
  }, [bet, playScript, setBalanceLocal]);

  spinRef.current = doSpin;

  const onCollect = async () => {
    if (!sessionId) return;
    try {
      sinigangSpinAudio.unlock();
      sinigangSpinAudio.playCollect();
      const res = await sinigangSpinCollectFn({ data: { sessionId } });
      setBalanceLocal(res.balance);
      setPendingWin(0);
      setSessionId(null);
      setGambleOpen(false);
      setLastWin(res.amount);
      toast.success(`Collected ${formatMoney(res.amount)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Collect failed");
    }
  };

  const onGamble = async (choice: GambleChoice) => {
    if (!sessionId) return;
    try {
      sinigangSpinAudio.unlock();
      sinigangSpinAudio.playGambleFlip();
      const res = await sinigangSpinGambleFn({ data: { sessionId, choice } });
      setBalanceLocal(res.balance);
      if (res.result.won) {
        setPendingWin(res.result.amount);
        sinigangSpinAudio.playCollect();
        toast.success(`Gamble win! ${formatMoney(res.result.amount)}`);
        if (res.collected) {
          setGambleOpen(false);
          setSessionId(null);
          setPendingWin(0);
          setLastWin(res.result.amount);
        } else {
          setSessionId(res.session.sessionId);
        }
      } else {
        sinigangSpinAudio.playDragonBust();
        toast.error(`Bust — drew ${res.result.drawn}`);
        setGambleOpen(false);
        setSessionId(null);
        setPendingWin(0);
        setLastWin(0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gamble failed");
    }
  };

  const cfg = getSinigangSpinConfig();
  const bi = betIndex(bet);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#1a0505]"
      data-game={gameId}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(185,28,28,0.45),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(120,53,15,0.35),_transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 25 L55 30 L35 35 L30 55 L25 35 L5 30 L25 25 Z' fill='%23fbbf24' fill-opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Compact header — more room for reels (elderly-friendly symbol size) */}
      <header className="relative z-20 shrink-0">
        <div
          className="relative border-b border-yellow-600/70"
          style={{
            background:
              "linear-gradient(180deg, #7f1d1d 0%, #450a0a 48%, #1c0808 100%)",
          }}
        >
          <div
            className="h-[2px] w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #B8860B 12%, #F5D76E 50%, #B8860B 88%, transparent 100%)",
            }}
          />

          <div className="flex items-center justify-center px-11 py-1.5 sm:px-14 sm:py-2.5">
            <div className="flex min-w-0 max-w-full flex-col items-center text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/80 sm:text-[11px]">
                Gong Xi Fa Cai
              </div>
              <h1
                className="truncate text-lg font-black tracking-wide text-transparent sm:text-xl"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, #FFF6C8 0%, #F5D76E 42%, #D4A017 78%, #8B6914 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 10px rgba(245,158,11,0.35))",
                }}
              >
                Sinigang Spin
              </h1>
            </div>
          </div>

          {fsProgress && (
            <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
              <span className="rounded-full border border-amber-300/80 bg-gradient-to-r from-red-800 via-amber-700 to-red-800 px-3 py-0.5 text-[11px] font-black text-yellow-50 shadow-[0_0_14px_rgba(220,38,38,0.55)]">
                {fsProgress}
              </span>
            </div>
          )}

          <div
            className="h-[2px] w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #B8860B 12%, #F5D76E 50%, #B8860B 88%, transparent 100%)",
            }}
          />
        </div>
      </header>

      {/* Reels — stretch to fill leftover height on mobile so symbols stay large */}
      <div className="relative z-10 flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-1.5 py-1 sm:items-center sm:px-3 sm:py-2">
        <div className="relative h-full w-full max-w-[1100px] sm:mx-auto sm:flex sm:max-h-full sm:items-center sm:justify-center">
          {/* Mobile: fill leftover height (bigger tiles). Desktop: 5:3 frame. */}
          <div
            className="box-border flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-[#C9A227]/90 bg-[#1a0606]/95 p-[3px] shadow-[0_0_40px_rgba(185,28,28,0.35),inset_0_0_0_1px_rgba(245,215,110,0.25)] sm:aspect-[5/3] sm:h-auto sm:max-h-full sm:w-full sm:rounded-2xl sm:border-[3px] sm:p-1.5"
            style={{ maxWidth: "min(100%, calc(85dvh * 5 / 3))" }}
          >
            <div
              className="grid h-full min-h-0 w-full flex-1 gap-1 sm:gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${cfg.reelsCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${cfg.rowsCount}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((col, reel) =>
                col.map((kind, row) => {
                  const key = cellKey(reel, row);
                  return (
                    <div
                      key={key}
                      className="relative min-h-0 min-w-0"
                      style={{ gridColumn: reel + 1, gridRow: row + 1 }}
                    >
                      <ReelCell
                        kind={kind}
                        phase={phase}
                        reel={reel}
                        row={row}
                        spinId={spinId}
                        winning={winningKeys.has(key)}
                        dimmed={winningKeys.size > 0 && !winningKeys.has(key)}
                        extraLabel={
                          kind === "extra_scatter" && extraScatter
                            ? SYMBOL_NAMES[extraScatter]
                            : null
                        }
                        className="h-full w-full"
                      />
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          <WinCelebration amount={winPopup} label={banner} />

          <AnimatePresence>
            {dragonOverlay && (
              <motion.div
                className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center">
                  <div className="text-4xl">🎆</div>
                  <div className="mt-1 text-sm font-bold uppercase text-yellow-200">
                    Launch #{dragonOverlay.launch} · {dragonOverlay.label}
                  </div>
                  <div className="text-2xl font-black text-amber-300">
                    {formatMoney(dragonOverlay.total)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {monkeyOverlay && (
              <motion.div
                className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-black/60"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mx-4 max-w-xs rounded-2xl border-2 border-yellow-400 bg-gradient-to-b from-red-800 to-amber-950 p-4 text-center shadow-xl">
                  <div className="text-xs font-bold uppercase tracking-widest text-yellow-200">
                    Fireworks Wheel
                  </div>
                  <div className="mx-auto mt-2 size-20">
                    <img
                      src={ICON_SRC[monkeyOverlay.extra]}
                      alt=""
                      className="size-full object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="mt-2 text-sm font-black text-yellow-100">
                    Extra Scatter: {SYMBOL_NAMES[monkeyOverlay.extra]}
                  </div>
                  <div className="text-xs text-amber-200/90">{monkeyOverlay.spins} Free Spins</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls — larger tap targets for older players */}
      <div className="relative z-20 border-t border-yellow-800/40 bg-black/60 px-2.5 py-2.5 backdrop-blur-sm sm:px-3 sm:py-3">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] font-semibold text-yellow-100/90 sm:text-sm">
            <span>Bal {formatMoneyCompact(balance)}</span>
            <span className="text-amber-300">Win {formatMoneyCompact(lastWin)}</span>
            <span>
              {cfg.paylineCount} lines · {formatMoneyCompact(bet)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet(BET_STEPS[Math.max(0, bi - 1)]!)}
              className="grid size-12 place-items-center rounded-lg border-2 border-yellow-700/60 bg-red-950/70 text-xl font-black text-yellow-100 disabled:opacity-40 sm:size-11"
            >
              −
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => !busy && setBetPickerOpen(true)}
              className="min-w-[4.5rem] rounded-lg border-2 border-yellow-600/60 bg-black/40 px-3 py-2.5 text-center text-base font-black tabular-nums text-yellow-100 transition hover:border-yellow-400/70 hover:bg-red-950/50 disabled:opacity-40 sm:text-lg"
              title="Select bet"
              aria-label="Open bet picker"
            >
              {formatMoneyCompact(bet)}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet(BET_STEPS[Math.min(BET_STEPS.length - 1, bi + 1)]!)}
              className="grid size-12 place-items-center rounded-lg border-2 border-yellow-700/60 bg-red-950/70 text-xl font-black text-yellow-100 disabled:opacity-40 sm:size-11"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setTurbo((t) => !t)}
              className={cn(
                "grid size-12 place-items-center rounded-lg border-2 sm:size-11",
                turbo
                  ? "border-amber-400 bg-amber-600/40 text-amber-100"
                  : "border-yellow-800/50 bg-black/40 text-yellow-200/70",
              )}
              title="Turbo"
            >
              <FastForward className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoSpin((a) => !a);
                if (!autoSpin && !busyRef.current) void doSpin();
              }}
              className={cn(
                "grid h-12 place-items-center rounded-lg border-2 px-3.5 text-xs font-bold uppercase tracking-wide sm:h-11",
                autoSpin
                  ? "border-red-400 bg-red-700/50 text-white"
                  : "border-yellow-800/50 bg-black/40 text-yellow-200/70",
              )}
            >
              Auto
            </button>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="grid size-12 place-items-center rounded-lg border-2 border-yellow-800/50 bg-black/40 text-yellow-200/80 sm:size-11"
              title="Paytable"
              aria-label="Info"
            >
              <Info className="size-5" />
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void doSpin()}
              className="flex min-h-12 items-center gap-2 rounded-lg border-2 border-yellow-400 bg-gradient-to-b from-red-600 to-red-900 px-6 py-2.5 text-base font-black uppercase tracking-wide text-yellow-50 shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 sm:min-h-11 sm:text-sm"
            >
              <RotateCcw className="size-5" />
              Spin
            </button>
          </div>
        </div>
      </div>

      {/* Gamble modal */}
      <AnimatePresence>
        {gambleOpen && (
          <motion.div
            className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full max-w-sm rounded-2xl border-2 border-yellow-500 bg-gradient-to-b from-red-950 to-stone-950 p-5 shadow-2xl">
              <h3 className="text-center text-lg font-black text-yellow-200">Gamble?</h3>
              <p className="mt-1 text-center text-xs text-yellow-100/70">
                Red / Black · double or nothing (format pending design sign-off)
              </p>
              <div className="mt-3 text-center text-2xl font-black text-amber-300">
                {formatMoney(pendingWin)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void onGamble("red")}
                  className="rounded-xl bg-red-700 py-3 font-black text-white"
                >
                  Red
                </button>
                <button
                  type="button"
                  onClick={() => void onGamble("black")}
                  className="rounded-xl bg-stone-900 py-3 font-black text-white ring-1 ring-white/30"
                >
                  Black
                </button>
              </div>
              <button
                type="button"
                onClick={() => void onCollect()}
                className="mt-3 w-full rounded-xl border border-yellow-500/70 bg-amber-700/40 py-2.5 text-sm font-bold text-yellow-100"
              >
                Collect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaytableModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      <AnimatePresence>
        {betPickerOpen && (
          <BetSelectModal
            currentBet={bet}
            onSelectBet={setBet}
            onClose={() => setBetPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
