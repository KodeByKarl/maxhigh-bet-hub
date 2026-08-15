/**
 * Crystal Cave — western Hold & Win slot UI.
 * Playback / win / idle reset follows Chinese New Year format.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_CRYSTAL_CAVE_CONFIG } from "@/lib/crystal-cave-config";
import { getCrystalCaveEngineConfigFn } from "@/functions/superadmin";
import {
  crystalCaveBuyFeatureFn,
  crystalCaveFreeSpinFn,
  crystalCaveSpinFn,
  getCrystalCaveSessionFn,
} from "@/functions/api";
import { ReelCell, type ReelPhase } from "./crystal-cave/ReelCell";
import { WinCelebration } from "./crystal-cave/WinCelebration";
import { ANIM } from "./crystal-cave/animationConfig";
import { crystalCaveAudio } from "./crystal-cave/audio";
import { getCrystalCaveConfig, setCrystalCaveConfig } from "./crystal-cave/runtimeConfig";
import type { FgGrid, SpinScript } from "./crystal-cave/types";
import { cellKey } from "./crystal-cave/types";
import type { FgSymKind } from "@/lib/crystal-cave-config";
import { TILE_IMAGE_MAP } from "./crystal-cave/CrystalCaveIcon";

const BET_STEPS = [0.25, 0.5, 1, 2, 5, 10, 20, 35];
const EMPTY_SET = new Set<string>();

function idleGrid(): FgGrid {
  const heights = DEFAULT_CRYSTAL_CAVE_CONFIG.reelHeights;
  const syms = DEFAULT_CRYSTAL_CAVE_CONFIG.symbols.filter((s) => s.tier === "low" || s.tier === "high");
  return heights.map((height, r) =>
    Array.from({ length: height }, (_, row) => syms[(r + row) % syms.length]!.kind),
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

export function CrystalCaveSlot() {
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
  const [boardHost, setBoardHost] = useState({ w: 0, h: 0 });

  /** Same as CNY: busy is derived from phase — idle always unlocks SPIN */
  const busy = phase !== "idle" || showBuy;
  const busyRef = useRef(false);
  const turboRef = useRef(turbo);
  const mountedRef = useRef(true);
  const playbackGen = useRef(0);
  const spinRef = useRef<() => Promise<void>>(async () => undefined);
  const boardHostRef = useRef<HTMLDivElement>(null);

  turboRef.current = turbo;

  const cfg = getCrystalCaveConfig();
  void cfgTick;
  const buyCost = +(bet * cfg.buyFeatureMult).toFixed(2);
  const displayWin = inFree ? fsSessionWin : lastWin;

  useEffect(() => {
    const el = boardHostRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBoardHost({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    crystalCaveAudio.preload();
    preloadAssets();
    void getCrystalCaveEngineConfigFn()
      .then((c) => {
        if (!mountedRef.current) return;
        setCrystalCaveConfig(c);
        setCfgTick((n) => n + 1);
        setGrid(idleGrid());
      })
      .catch(() => undefined);
    getCrystalCaveSessionFn()
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
      crystalCaveAudio.stopAmbient();
    };
  }, []);

  /**
   * Playback: spin → stop → (win → remove → drop → …) → features → idle
   */
  const playScript = useCallback(
    async (script: SpinScript, gen: number) => {
      const liveCfg = getCrystalCaveConfig();
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
      crystalCaveAudio.unlock();
      crystalCaveAudio.startSpinLoop();

      await wait(ANIM.reelSpin, gen);
      crystalCaveAudio.playReelStop();

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
          crystalCaveAudio.playWin();
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
        crystalCaveAudio.playHoldWin();
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
        crystalCaveAudio.playCoinLock();
        await wait(500, gen);

        const hwSteps = Array.isArray(holdWin.steps) ? holdWin.steps : [];
        const interesting = hwSteps.filter((s) => (s.newCoins?.length ?? 0) > 0);
        const playback = (interesting.length > 0 ? interesting : hwSteps).slice(0, 8);
        for (const step of playback) {
          if ((step.newCoins?.length ?? 0) > 0) crystalCaveAudio.playCoinLand();
          setHoldOverlay({ ...holdWin, steps: [step] });
          await wait(ANIM.holdStep * 0.7, gen);
        }

        setHoldOverlay(holdWin);
        const holdTotal = Number(holdWin.totalWin) || 0;
        if (holdWin.grandAwarded) {
          crystalCaveAudio.playJackpot();
          setBanner("GRAND JACKPOT");
        } else {
          crystalCaveAudio.playWin();
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
        crystalCaveAudio.playFreeSpins();
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
        const res = await crystalCaveFreeSpinFn({ data: { sessionId } });
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
          crystalCaveAudio.playWin();
          toast.success(`Free Spins Complete! Won ${formatMoney(res.fsPayout.amount)}`, {
            duration: 6000,
          });
          await wait(900, gen);
          setWinPopup(null);
          setBanner(null);
        }
      } else {
        const res = await crystalCaveSpinFn({ data: { bet } });
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
      crystalCaveAudio.stopSpinLoop();
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
      crystalCaveAudio.unlock();
      crystalCaveAudio.playUiClick();
      const res = await crystalCaveBuyFeatureFn({ data: { bet } });
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
      crystalCaveAudio.stopSpinLoop();
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
    crystalCaveAudio.unlock();
    crystalCaveAudio.playUiClick();
    const i = BET_STEPS.findIndex((v) => v >= bet);
    const idx = i < 0 ? BET_STEPS.length - 1 : i;
    setBet(BET_STEPS[Math.max(0, Math.min(BET_STEPS.length - 1, idx + dir))]!);
  }

  function toggleMute() {
    crystalCaveAudio.unlock();
    setMuted(crystalCaveAudio.toggleMute());
  }

  const coinAt = (reel: number, row: number) => {
    if (!holdOverlay) return null;
    const coins = holdOverlay.steps.length
      ? holdOverlay.steps[holdOverlay.steps.length - 1]!.coins
      : holdOverlay.triggerCoins;
    return coins.find((c) => c.reel === reel && c.row === row) ?? null;
  };

  const reelHeights =
    cfg.reelHeights?.length === cfg.reelsCount
      ? cfg.reelHeights
      : Array.from({ length: cfg.reelsCount }, () => cfg.rowsCount);
  const maxReelRows = Math.max(...reelHeights, 1);
  const reelCols = reelHeights.length;

  /**
   * Size circles as large as possible while keeping ALL columns on-screen.
   * 3-4-5-4-3 (5 cols) fills the phone much better than the old 7-col diamond.
   */
  const availW = boardHost.w;
  const availH = boardHost.h;
  const narrow = availW > 0 && availW < 720;
  const sidePad = narrow ? 4 : 0;
  const cellGap =
    availW > 0
      ? Math.max(narrow ? 3 : 5, Math.round(Math.min(availW, availH) * (narrow ? 0.008 : 0.01)))
      : 2;
  const byHeight =
    availH > 0 ? (availH - cellGap * Math.max(0, maxReelRows - 1)) / maxReelRows : 0;
  const byWidthFit =
    availW > 0
      ? (availW - sidePad * 2 - cellGap * Math.max(0, reelCols - 1)) / reelCols
      : 0;
  const circlePx =
    availW > 0 && availH > 0
      ? Math.max(48, Math.floor(Math.min(byHeight, byWidthFit)))
      : 0;
  const boardW = circlePx > 0 ? circlePx * reelCols + cellGap * (reelCols - 1) : undefined;
  const boardH = circlePx > 0 ? circlePx * maxReelRows + cellGap * (maxReelRows - 1) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <img
        src="/games/crystal-cave.webp"
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_20%]"
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(69,26,3,0.2) 0%, rgba(28,15,8,0.4) 28%, rgba(12,6,3,0.68) 55%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      <div className="pointer-events-none absolute left-0 right-0 top-1 z-30 flex flex-col items-center gap-1 px-2 sm:top-2">
        <div className="rounded-full border border-amber-700/90 bg-gradient-to-b from-amber-200 to-amber-600 px-3 py-0.5 text-[10px] font-black text-amber-950 shadow sm:border-2 sm:px-5 sm:py-1 sm:text-sm">
          Crystal Cave · Hold & Win · {cfg.paylineCount} Ways
        </div>
        {inFree && (
          <div className="rounded-lg border border-amber-400/60 bg-amber-950/85 px-3 py-0.5 text-[10px] font-bold text-amber-200 sm:text-xs">
            FREE SPINS {freeSpinsLeft} · Session {formatMoney(fsSessionWin)}
          </div>
        )}
      </div>

      {/* Diamond board — 3-4-5-4-3, sized to fill play area */}
      <div
        ref={boardHostRef}
        className="absolute inset-x-0 bottom-[6.5rem] top-7 z-10 flex items-center justify-center overflow-hidden px-1 sm:bottom-28 sm:top-10 sm:px-2"
      >
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: boardW ?? "100%",
            height: boardH ?? "100%",
          }}
        >
          <div className="flex items-center justify-center" style={{ gap: cellGap }}>
            {reelHeights.map((height, reel) => (
              <div
                key={reel}
                className="flex flex-col justify-center"
                style={{ width: circlePx || undefined, gap: cellGap }}
              >
                {Array.from({ length: height }, (_, row) => {
                  const kind = grid[reel]?.[row] ?? "sym_j";
                  const key = cellKey(reel, row);
                  const coin = coinAt(reel, row);
                  const winning = winningKeys.has(key);
                  const removing = removingKeys.has(key);
                  return (
                    <ReelCell
                      key={key}
                      kind={coin ? "bonus" : (kind as FgSymKind)}
                      phase={phase}
                      reel={reel}
                      row={row}
                      spinId={spinId}
                      winning={winning}
                      removing={removing}
                      dimmed={winningKeys.size > 0 && !winning && !removing}
                      coinLabel={coin ? coin.label : undefined}
                      style={
                        circlePx > 0
                          ? { width: circlePx, height: circlePx, flex: "none" }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {cascadeBadge != null && cascadeBadge > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-[10%] z-30 -translate-x-1/2 rounded-full border-2 border-yellow-300 bg-gradient-to-b from-red-700 to-amber-950 px-4 py-1 text-center shadow-lg">
            <div className="text-[9px] font-black uppercase tracking-widest text-yellow-100">
              Cascade
            </div>
            <div className="text-sm font-black text-amber-200">{formatMoney(cascadeBadge)}</div>
          </div>
        )}

        <WinCelebration amount={winPopup} label={banner} />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-amber-700/50 bg-[#2a160c]/95 px-2 py-1.5 text-amber-100 backdrop-blur-md sm:px-4 sm:py-2">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-black tabular-nums sm:justify-start sm:gap-3 sm:text-sm">
            <span>
              <span className="text-amber-400/80">CREDIT </span>
              {formatMoney(balance)}
            </span>
            <span>
              <span className="text-amber-400/80">BET </span>
              {formatMoney(bet)}
            </span>
            <span>
              <span className="text-amber-400/80">WIN </span>
              {formatMoney(displayWin)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowBuy(true)}
              disabled={busy || inFree}
              className="rounded-full border-2 border-amber-500 px-2 py-1 text-[9px] font-black uppercase text-amber-200 disabled:opacity-40 sm:px-3 sm:text-xs"
            >
              Buy FS
            </button>
            <button
              type="button"
              onClick={() => {
                crystalCaveAudio.unlock();
                crystalCaveAudio.playUiClick();
                setTurbo((v) => !v);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-2 px-2 py-1 text-[9px] font-black uppercase sm:text-xs",
                turbo ? "border-amber-300 bg-amber-400 text-amber-950" : "border-amber-600 text-amber-200",
              )}
            >
              <Zap size={11} /> Turbo
            </button>
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              className="grid size-9 place-items-center rounded-full border-2 border-amber-600 text-amber-200"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              type="button"
              disabled={busy || inFree}
              onClick={() => nudgeBet(-1)}
              className="grid size-10 place-items-center rounded-full bg-red-800 text-lg font-black text-white disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void spinRef.current()}
              className="grid size-14 place-items-center rounded-full border-[3px] border-amber-300 bg-gradient-to-b from-red-500 to-red-900 text-sm font-black text-amber-100 disabled:opacity-60"
            >
              {busy ? "…" : "SPIN"}
            </button>
            <button
              type="button"
              disabled={busy || inFree}
              onClick={() => nudgeBet(1)}
              className="grid size-10 place-items-center rounded-full bg-red-800 text-lg font-black text-white disabled:opacity-40"
            >
              +
            </button>
            <button
              type="button"
              title="720 ways diamond · Wild · Scatter FS · 6+ coins Hold & Win"
              className="grid size-9 place-items-center rounded-full border-2 border-amber-600 text-amber-200"
            >
              <Info size={15} />
            </button>
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
