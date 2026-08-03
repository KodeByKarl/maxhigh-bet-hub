/**
 * Frontier Gold — western Hold & Win slot UI.
 * Playback / win / idle reset follows Chinese New Year format.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_FRONTIER_GOLD_CONFIG } from "@/lib/frontier-gold-config";
import { getFrontierGoldEngineConfigFn } from "@/functions/superadmin";
import {
  frontierGoldBuyFeatureFn,
  frontierGoldFreeSpinFn,
  frontierGoldSpinFn,
  getFrontierGoldSessionFn,
} from "@/functions/api";
import { ReelCell, type ReelPhase } from "./frontier-gold/ReelCell";
import { WinCelebration } from "./frontier-gold/WinCelebration";
import { ANIM } from "./frontier-gold/animationConfig";
import { frontierAudio } from "./frontier-gold/audio";
import { getFrontierGoldConfig, setFrontierGoldConfig } from "./frontier-gold/runtimeConfig";
import type { FgGrid, SpinScript } from "./frontier-gold/types";
import { cellKey } from "./frontier-gold/types";
import type { FgSymKind } from "@/lib/frontier-gold-config";
import { TILE_IMAGE_MAP } from "./frontier-gold/FrontierIcon";

const BET_STEPS = [0.25, 0.5, 1, 2, 5, 10, 20, 35];
const COLS = 5;
const ROWS = 3;
const EMPTY_SET = new Set<string>();

function idleGrid(): FgGrid {
  const syms = DEFAULT_FRONTIER_GOLD_CONFIG.symbols.filter((s) => s.tier === "low" || s.tier === "high");
  return Array.from({ length: COLS }, (_, r) =>
    Array.from({ length: ROWS }, (_, row) => syms[(r + row) % syms.length]!.kind),
  );
}

function preloadAssets() {
  if (typeof Image === "undefined") return;
  for (const src of Object.values(TILE_IMAGE_MAP)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function FrontierGoldSlot() {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [grid, setGrid] = useState<FgGrid>(() => idleGrid());
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [spinId, setSpinId] = useState(0);
  const [winningKeys, setWinningKeys] = useState<Set<string>>(EMPTY_SET);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(EMPTY_SET);
  const [turbo, setTurbo] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<number | null>(null);
  const [cascadeBadge, setCascadeBadge] = useState<number | null>(null);
  const [holdOverlay, setHoldOverlay] = useState<SpinScript["holdWin"]>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [fsSessionWin, setFsSessionWin] = useState(0);
  const [inFree, setInFree] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cfgTick, setCfgTick] = useState(0);

  /** Same as CNY: busy is derived from phase — idle always unlocks SPIN */
  const busy = phase !== "idle" || showBuy;
  const busyRef = useRef(false);
  const turboRef = useRef(turbo);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const spinRef = useRef<() => Promise<void>>(async () => undefined);

  turboRef.current = turbo;

  const cfg = getFrontierGoldConfig();
  void cfgTick;
  const buyCost = +(bet * cfg.buyFeatureMult).toFixed(2);
  const displayWin = inFree ? fsSessionWin : lastWin;

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
    frontierAudio.preload();
    preloadAssets();
    void getFrontierGoldEngineConfigFn()
      .then((c) => {
        if (!mountedRef.current) return;
        setFrontierGoldConfig(c);
        setCfgTick((n) => n + 1);
        setGrid(idleGrid());
      })
      .catch(() => undefined);
    getFrontierGoldSessionFn()
      .then((s) => {
        if (s?.inFree && mountedRef.current) {
          setSessionId(s.sessionId);
          setFreeSpinsLeft(s.freeSpinsLeft);
          setFsSessionWin(s.fsSessionWin);
          setInFree(true);
          toast.info(`Resuming Free Spins (${s.freeSpinsLeft} left)`);
        }
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      playbackGen.current += 1;
      busyRef.current = false;
      frontierAudio.stopAmbient();
    };
  }, []);

  /**
   * Playback: spin → stop → (win → remove → drop → …) → features → idle
   */
  const playScript = useCallback(
    async (script: SpinScript, gen: number) => {
      const liveCfg = getFrontierGoldConfig();
      const steps = Array.isArray(script.steps) && script.steps.length > 0
        ? script.steps
        : [
            {
              stepIndex: 0,
              grid: script.grid,
              paylineWins: script.paylineWins ?? [],
              paylineWin: script.paylineWin ?? 0,
              removed: [] as Array<[number, number]>,
            },
          ];
      const holdWin = script.holdWin ?? null;

      setWinningKeys(EMPTY_SET);
      setRemovingKeys(EMPTY_SET);
      setWinPopup(null);
      setCascadeBadge(null);
      setHoldOverlay(null);
      setBanner(null);
      setSpinId((n) => n + 1);
      setPhase("spinning");
      frontierAudio.unlock();
      frontierAudio.startSpinLoop();

      await wait(ANIM.reelSpin, gen);
      frontierAudio.playReelStop();

      let runningWin = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        setGrid(step.grid);
        setRemovingKeys(EMPTY_SET);

        if (i === 0) {
          setPhase("stopping");
          await wait(ANIM.reelStagger * (liveCfg.reelsCount - 1) + ANIM.reelSettle, gen);
        } else {
          // Cascade drop-in
          setSpinId((n) => n + 1);
          setPhase("stopping");
          await wait(ANIM.tumbleDrop, gen);
        }

        const wins = step.paylineWins ?? [];
        if (wins.length > 0 && (step.paylineWin ?? 0) > 0) {
          const keys = new Set<string>();
          for (const w of wins) {
            for (const [reel, row] of w.positions ?? []) keys.add(cellKey(reel, row));
          }
          setWinningKeys(keys);
          setPhase("win");
          runningWin += step.paylineWin;
          setCascadeBadge(runningWin);
          setWinPopup(step.paylineWin);
          setLastWin(runningWin);
          frontierAudio.playWin();
          await wait(ANIM.lineHighlight, gen);

          // Remove winning symbols, then auto-respin (cascade)
          if (step.removed.length > 0) {
            const rm = new Set(step.removed.map(([r, row]) => cellKey(r, row)));
            setRemovingKeys(rm);
            await wait(ANIM.tumbleRemove, gen);
            setWinningKeys(EMPTY_SET);
            setRemovingKeys(EMPTY_SET);
            setWinPopup(null);
          } else {
            setWinningKeys(EMPTY_SET);
            setWinPopup(null);
          }
        } else {
          // Keep busy locked between cascade steps / feature outros
          setPhase("stopping");
        }
      }

      setCascadeBadge(null);
      setWinningKeys(EMPTY_SET);
      setRemovingKeys(EMPTY_SET);

      // Hold & Win on final board
      if (holdWin) {
        setPhase("win");
        setWinPopup(null);
        setBanner("HOLD & WIN!");
        frontierAudio.playHoldWin();
        setHoldOverlay({
          ...holdWin,
          steps: [
            {
              stepIndex: -1,
              respinsLeft: liveCfg.holdWinRespins,
              coins: holdWin.triggerCoins ?? [],
              newCoins: holdWin.triggerCoins ?? [],
            },
          ],
        });
        frontierAudio.playCoinLock();
        await wait(500, gen);

        const hwSteps = Array.isArray(holdWin.steps) ? holdWin.steps : [];
        const interesting = hwSteps.filter((s) => (s.newCoins?.length ?? 0) > 0);
        const playback = (interesting.length > 0 ? interesting : hwSteps).slice(0, 8);
        for (const step of playback) {
          if ((step.newCoins?.length ?? 0) > 0) frontierAudio.playCoinLand();
          setHoldOverlay({ ...holdWin, steps: [step] });
          await wait(ANIM.holdStep * 0.7, gen);
        }

        setHoldOverlay(holdWin);
        const holdTotal = Number(holdWin.totalWin) || 0;
        if (holdWin.grandAwarded) {
          frontierAudio.playJackpot();
          setBanner("GRAND JACKPOT");
        } else {
          frontierAudio.playWin();
          setBanner("HOLD & WIN");
        }
        setWinPopup(holdTotal);
        await wait(ANIM.holdOutro * 0.8, gen);
        setHoldOverlay(null);
        setBanner(null);
        setWinPopup(null);
      }

      if ((script.freeSpinsAwarded ?? 0) > 0) {
        setPhase("win");
        frontierAudio.playFreeSpins();
        setBanner(`FREE SPINS ×${script.freeSpinsAwarded}`);
        await wait(ANIM.freeSpinBanner, gen);
        setBanner(null);
      }

      const total = Number(script.totalWin) || 0;
      setLastWin(total);
      if (total > 0) {
        setPhase("win");
        setWinPopup(total);
        await wait(ANIM.lineHighlight * 0.55, gen);
      }
      setWinningKeys(EMPTY_SET);
      setRemovingKeys(EMPTY_SET);
      setWinPopup(null);
      setHoldOverlay(null);
      setBanner(null);
      setCascadeBadge(null);
      setPhase("idle");
    },
    [wait],
  );

  /** Auto-play remaining free spins (Mahjong / Starlight pattern). */
  useEffect(() => {
    if (!inFree || busy || freeSpinsLeft <= 0 || !sessionId) return;
    const id = setTimeout(() => {
      void spinRef.current();
    }, 500);
    return () => clearTimeout(id);
  }, [inFree, busy, freeSpinsLeft, sessionId, lastWin]);

  const doSpin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const gen = ++playbackGen.current;
    // Lock UI immediately (API latency) — same as Mahjong / Starlight
    setPhase("spinning");
    setWinningKeys(EMPTY_SET);
    setRemovingKeys(EMPTY_SET);
    try {
      if (inFree && sessionId) {
        const res = await frontierGoldFreeSpinFn({ data: { sessionId } });
        if (!mountedRef.current || gen !== playbackGen.current) return;
        // Update FS counter before playback so auto-continue deps stay correct
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(res.session.fsSessionWin);
        setInFree(res.session.inFree);
        setBalanceLocal(res.balance);
        await playScript(res.script, gen);
        if (!mountedRef.current || gen !== playbackGen.current) return;
        if (res.fsPayout) {
          setLastWin(res.fsPayout.amount);
          setWinPopup(res.fsPayout.amount);
          setBanner("FS TOTAL");
          frontierAudio.playWin();
          toast.success(`Free Spins Complete! Won ${formatMoney(res.fsPayout.amount)}`, {
            duration: 6000,
          });
          await wait(900, gen);
          setWinPopup(null);
          setBanner(null);
        }
      } else {
        const res = await frontierGoldSpinFn({ data: { bet } });
        if (!mountedRef.current || gen !== playbackGen.current) return;
        const triggeredFs = res.session.inFree;
        if (triggeredFs) {
          setSessionId(res.session.sessionId);
          setFreeSpinsLeft(res.session.freeSpinsLeft);
          setFsSessionWin(res.session.fsSessionWin);
          setInFree(true);
        }
        setBalanceLocal(res.balance);
        await playScript(res.script, gen);
        if (!mountedRef.current || gen !== playbackGen.current) return;
        if (triggeredFs) {
          setBanner(`${res.session.freeSpinsLeft} Free Spins!`);
          toast.success(`Scatter! ${res.session.freeSpinsLeft} Free Spins awarded`);
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Spin failed");
      setWinningKeys(EMPTY_SET);
      setRemovingKeys(EMPTY_SET);
      setWinPopup(null);
      setCascadeBadge(null);
      setHoldOverlay(null);
      setBanner(null);
      setPhase("idle");
    } finally {
      frontierAudio.stopSpinLoop();
      if (gen === playbackGen.current) {
        busyRef.current = false;
      }
      if (mountedRef.current && gen === playbackGen.current) {
        setWinningKeys(EMPTY_SET);
        setRemovingKeys(EMPTY_SET);
        setWinPopup(null);
        setCascadeBadge(null);
        setHoldOverlay(null);
        setPhase("idle");
      }
    }
  }, [bet, inFree, sessionId, playScript, setBalanceLocal, wait]);

  spinRef.current = doSpin;

  async function handleBuy() {
    if (busyRef.current || inFree || phase !== "idle") return;
    busyRef.current = true;
    setShowBuy(false);
    const gen = ++playbackGen.current;
    setPhase("spinning");
    try {
      frontierAudio.unlock();
      frontierAudio.playUiClick();
      const res = await frontierGoldBuyFeatureFn({ data: { bet } });
      if (!mountedRef.current || gen !== playbackGen.current) return;
      if (res.session.inFree) {
        setSessionId(res.session.sessionId);
        setFreeSpinsLeft(res.session.freeSpinsLeft);
        setFsSessionWin(0);
        setInFree(true);
      }
      setBalanceLocal(res.balance);
      await playScript(res.script, gen);
      if (!mountedRef.current || gen !== playbackGen.current) return;
      if (res.session.inFree) {
        setBanner(`${res.session.freeSpinsLeft} Free Spins!`);
        toast.success(`Feature Buy! ${res.session.freeSpinsLeft} Free Spins`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Buy failed");
      setPhase("idle");
    } finally {
      frontierAudio.stopSpinLoop();
      if (gen === playbackGen.current) {
        busyRef.current = false;
      }
      if (mountedRef.current && gen === playbackGen.current) {
        setWinningKeys(EMPTY_SET);
        setRemovingKeys(EMPTY_SET);
        setWinPopup(null);
        setCascadeBadge(null);
        setHoldOverlay(null);
        setPhase("idle");
      }
    }
  }

  function nudgeBet(dir: -1 | 1) {
    if (busy) return;
    frontierAudio.unlock();
    frontierAudio.playUiClick();
    const i = BET_STEPS.findIndex((v) => v >= bet);
    const idx = i < 0 ? BET_STEPS.length - 1 : i;
    setBet(BET_STEPS[Math.max(0, Math.min(BET_STEPS.length - 1, idx + dir))]!);
  }

  function toggleMute() {
    frontierAudio.unlock();
    setMuted(frontierAudio.toggleMute());
  }

  const coinAt = (reel: number, row: number) => {
    if (!holdOverlay) return null;
    const coins = holdOverlay.steps.length
      ? holdOverlay.steps[holdOverlay.steps.length - 1]!.coins
      : holdOverlay.triggerCoins;
    return coins.find((c) => c.reel === reel && c.row === row) ?? null;
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden select-none">
      <img
        src="/games/frontier-gold.png"
        alt=""
        className="absolute inset-0 size-full object-cover"
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(69,26,3,0.35) 0%, rgba(28,15,8,0.55) 45%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-2 pb-2 pt-2 sm:px-4">
        <div className="flex h-full min-h-0 w-full max-w-[1600px] flex-col items-center">
          <div
            className="flex h-full min-h-0 max-h-full flex-col items-stretch"
            style={{
              width: `min(100%, calc((100dvh - 7.5rem) * ${COLS} / ${ROWS}))`,
            }}
          >
            <div className="mx-auto mb-1.5 shrink-0 rounded-full border-2 border-amber-700 bg-gradient-to-b from-amber-200 to-amber-600 px-4 py-1 text-xs font-black text-amber-950 shadow sm:mb-2 sm:px-5 sm:text-sm">
              Frontier Gold · Hold & Win · 25 Lines
            </div>

            {inFree && (
              <div className="mx-auto mb-1.5 shrink-0 rounded-lg border border-amber-400/60 bg-amber-950/80 px-3 py-1 text-xs font-bold text-amber-200">
                FREE SPINS {freeSpinsLeft} · Session {formatMoney(fsSessionWin)}
              </div>
            )}

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
                <div
                  className="relative size-full rounded-[0.85rem] p-[5px] shadow-[0_18px_50px_rgba(180,83,9,0.55)] sm:rounded-[1.15rem] sm:p-[8px]"
                  style={{
                    background: "linear-gradient(145deg,#fde68a 0%,#fbbf24 28%,#b45309 62%,#78350f 100%)",
                  }}
                >
                  <div
                    className="relative grid size-full gap-[2px] overflow-hidden rounded-[0.55rem] p-[2px] sm:gap-1 sm:rounded-[0.8rem] sm:p-1"
                    style={{
                      background: "linear-gradient(180deg,#2a160c 0%,#1c1008 100%)",
                      gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                      boxShadow: "inset 0 0 28px rgba(0,0,0,0.45)",
                    }}
                  >
                    {grid.map((col, reel) =>
                      col.map((kind, row) => {
                        const key = cellKey(reel, row);
                        const coin = coinAt(reel, row);
                        const winning = winningKeys.has(key);
                        const removing = removingKeys.has(key);
                        return (
                          <div
                            key={key}
                            className="relative min-h-0 min-w-0 overflow-hidden"
                            style={{ gridColumn: reel + 1, gridRow: row + 1 }}
                          >
                            <ReelCell
                              kind={coin ? "bonus" : (kind as FgSymKind)}
                              phase={phase}
                              reel={reel}
                              row={row}
                              spinId={spinId}
                              winning={winning}
                              removing={removing}
                              dimmed={winningKeys.size > 0 && !winning && !removing}
                              coinLabel={coin ? coin.label : undefined}
                              className="!aspect-auto h-full w-full"
                            />
                          </div>
                        );
                      }),
                    )}
                  </div>
                </div>

                {cascadeBadge != null && cascadeBadge > 0 && (
                  <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border-2 border-yellow-300 bg-gradient-to-b from-red-700 to-amber-950 px-4 py-1 text-center shadow-lg">
                    <div className="text-[9px] font-black uppercase tracking-widest text-yellow-100">
                      Cascade
                    </div>
                    <div className="text-sm font-black text-amber-200">{formatMoney(cascadeBadge)}</div>
                  </div>
                )}

                <WinCelebration amount={winPopup} label={banner} />
              </div>
            </div>

            <div className="mt-1.5 flex w-full shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-700/50 bg-[#2a160c]/95 px-3 py-2 text-amber-100 sm:mt-2 sm:px-4 sm:py-2.5">
              <div className="text-[11px] font-black sm:text-xs">
                <span className="text-amber-400/80">CREDIT </span>
                {formatMoney(balance)}
                <span className="ml-2 text-amber-400/80">BET </span>
                {formatMoney(bet)}
                <span className="ml-2 text-amber-400/80">WIN </span>
                {formatMoney(displayWin)}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowBuy(true)}
                  disabled={busy || inFree}
                  className="rounded-full border border-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-amber-200 disabled:opacity-40"
                >
                  Buy FS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    frontierAudio.unlock();
                    frontierAudio.playUiClick();
                    setTurbo((v) => !v);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase",
                    turbo ? "border-amber-300 bg-amber-400 text-amber-950" : "border-amber-600 text-amber-200",
                  )}
                >
                  <Zap size={10} /> Turbo
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  title={muted ? "Unmute" : "Mute"}
                  className="grid size-7 place-items-center rounded-full border border-amber-600 text-amber-200 sm:size-8"
                >
                  {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <button
                  type="button"
                  disabled={busy || inFree}
                  onClick={() => nudgeBet(-1)}
                  className="grid size-8 place-items-center rounded-full bg-red-800 font-black text-white disabled:opacity-40 sm:size-9"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void spinRef.current()}
                  className="grid size-12 place-items-center rounded-full border-2 border-amber-300 bg-gradient-to-b from-red-500 to-red-900 text-xs font-black text-amber-100 disabled:opacity-60 sm:size-14 sm:text-sm"
                >
                  {busy ? "…" : "SPIN"}
                </button>
                <button
                  type="button"
                  disabled={busy || inFree}
                  onClick={() => nudgeBet(1)}
                  className="grid size-8 place-items-center rounded-full bg-red-800 font-black text-white disabled:opacity-40 sm:size-9"
                >
                  +
                </button>
                <button
                  type="button"
                  title="25 lines · Wild · Scatter FS · 6+ coins Hold & Win"
                  className="grid size-7 place-items-center rounded-full border border-amber-600 text-amber-200 sm:size-8"
                >
                  <Info size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBuy && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-amber-500 bg-[#2a160c] p-5 text-center">
            <h3 className="mb-2 text-lg font-black text-amber-300">BUY FREE SPINS</h3>
            <p className="mb-3 text-xs text-amber-100/70">
              Cost {formatMoney(buyCost)} ({cfg.buyFeatureMult}× bet). Awards {cfg.freeSpinsBaseCount}+
              free spins.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBuy(false)}
                className="flex-1 rounded-xl bg-black/40 py-2 text-xs font-bold text-amber-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBuy()}
                className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-black text-amber-950"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
