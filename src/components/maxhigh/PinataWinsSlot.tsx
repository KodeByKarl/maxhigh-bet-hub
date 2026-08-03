/**
 * Piñata Wins slot UI — replays server-resolved cascade / Gold Frame / FS scripts.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  getPinataWinsEngineConfigFn,
  getPinataWinsSessionFn,
  pinataWinsBuyFeatureFn,
  pinataWinsFreeSpinFn,
  pinataWinsSpinFn,
} from "@/functions/api";
import { useAuth } from "@/lib/auth";
import {
  PINATA_WINS_GAME_ID,
  type PwWinsConfig,
  type PwSymKind,
} from "@/lib/pinata-wins-config";
import { cn } from "@/lib/utils";
import { ANIM, BET_STEPS } from "./pinata-wins/animationConfig";
import { BanderitasBorder } from "./pinata-wins/BanderitasBorder";
import { ReelCell, type ReelPhase } from "./pinata-wins/ReelCell";
import { getPinataWinsConfig, setPinataWinsConfig } from "./pinata-wins/runtimeConfig";
import { planPinataPlayback, type PwPlaybackStep } from "./pinata-wins/spinPlayback";
import { cellKey, makeCell, type PwGrid, type SpinScript } from "./pinata-wins/types";
import { WinModal, type PinataWinPopup } from "./pinata-wins/WinModal";

function idleGrid(): PwGrid {
  const cfg = getPinataWinsConfig();
  const kinds: PwSymKind[] = ["chili", "taco", "maracas", "sombrero", "cactus", "guitar", "golden_skull"];
  return Array.from({ length: cfg.reelsCount }, (_, reel) =>
    Array.from({ length: cfg.rowsCount }, (_, row) => makeCell(kinds[(reel + row) % kinds.length]!)),
  );
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SessionSnap = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  persistentMult: number;
  inFree: boolean;
  bet: number;
};

export function PinataWinsSlot({
  gameId = PINATA_WINS_GAME_ID,
}: {
  gameId?: string;
  gameName?: string;
} = {}) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [cfgSnap, setCfgSnap] = useState<PwWinsConfig>(() => getPinataWinsConfig());
  const [grid, setGrid] = useState<PwGrid>(idleGrid);
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [spinId, setSpinId] = useState(0);
  const [winKeys, setWinKeys] = useState<string[]>([]);
  const [goldKeys, setGoldKeys] = useState<string[]>([]);
  const [transformKeys, setTransformKeys] = useState<string[]>([]);
  const [removeKeys, setRemoveKeys] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState<PinataWinPopup | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [spinGoldMult, setSpinGoldMult] = useState(0);
  const [locked, setLocked] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [session, setSession] = useState<SessionSnap>({
    sessionId: null,
    freeSpinsLeft: 0,
    fsSessionWin: 0,
    persistentMult: 0,
    inFree: false,
    bet: 0,
  });

  const runIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const autoRef = useRef(autoSpin);
  const turboRef = useRef(turbo);
  const betRef = useRef(bet);
  const sessionRef = useRef(session);
  const startSpinRef = useRef<() => void>(() => undefined);

  autoRef.current = autoSpin;
  turboRef.current = turbo;
  betRef.current = bet;
  sessionRef.current = session;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      try {
        const cfg = await getPinataWinsEngineConfigFn();
        if (!mountedRef.current) return;
        setPinataWinsConfig(cfg);
        setCfgSnap(cfg);
        const sess = await getPinataWinsSessionFn();
        if (!mountedRef.current) return;
        setSession({
          sessionId: sess.sessionId,
          freeSpinsLeft: sess.freeSpinsLeft,
          fsSessionWin: sess.fsSessionWin,
          persistentMult: sess.persistentMult,
          inFree: sess.inFree,
          bet: sess.bet,
        });
      } catch {
        /* defaults */
      }
    })();
    return () => {
      mountedRef.current = false;
      clearTimer();
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const applySession = (s: {
    sessionId: string | null;
    freeSpinsLeft: number;
    fsSessionWin: number;
    persistentMult: number;
    inFree: boolean;
    bet: number;
  }) => {
    setSession(s);
    sessionRef.current = s;
  };

  const playScript = useCallback((script: SpinScript, onDone: () => void) => {
    const runId = ++runIdRef.current;
    const plan = planPinataPlayback(script, turboRef.current);
    let i = 0;

    const tick = () => {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      const step: PwPlaybackStep | undefined = plan[i++];
      if (!step) {
        onDone();
        return;
      }

      switch (step.type) {
        case "spinning":
          setPhase("spinning");
          setWinKeys([]);
          setGoldKeys([]);
          setTransformKeys([]);
          setRemoveKeys([]);
          setBanner(null);
          setWinPopup(null);
          break;
        case "landing":
          setSpinId((n) => n + 1);
          setPhase("stopping");
          setGrid(step.grid);
          setWinKeys([]);
          setGoldKeys([]);
          setTransformKeys([]);
          setRemoveKeys([]);
          setWinPopup(null);
          break;
        case "cascade":
          setSpinId((n) => n + 1);
          setPhase("stopping");
          setGrid(step.grid);
          setWinKeys([]);
          setGoldKeys([]);
          setTransformKeys([]);
          setRemoveKeys([]);
          setWinPopup(null);
          break;
        case "highlight":
          setPhase("win");
          setWinKeys(step.keys);
          setRemoveKeys([]);
          setBanner(null);
          setWinPopup({
            title: "Line Win",
            amount: step.amount,
            tone: "line",
          });
          break;
        case "gold_collect":
          setGoldKeys(step.keys);
          setSpinGoldMult(step.total);
          setBanner(null);
          setWinPopup({
            title: "Gold Frame",
            subtitle: `+${step.delta}x → ${step.total}x`,
            tone: "gold",
          });
          break;
        case "gold_transform":
          setTransformKeys(step.keys);
          setBanner(null);
          setWinPopup({
            title: "Exploding Wilds!",
            tone: "feature",
          });
          break;
        case "removing":
          setRemoveKeys(step.keys);
          setWinPopup(null);
          break;
        case "tally":
          setLastWin(step.amount);
          setBanner(null);
          setRemoveKeys([]);
          setWinPopup({
            title: step.appliedMult > 1 ? `${step.appliedMult}x Total Win` : "Total Win",
            amount: step.amount,
            tone: "total",
          });
          break;
        case "done":
          setPhase("idle");
          setWinKeys([]);
          setGoldKeys([]);
          setTransformKeys([]);
          setRemoveKeys([]);
          setLastWin(step.totalWin);
          setWinPopup(null);
          onDone();
          return;
      }

      timerRef.current = setTimeout(tick, "ms" in step ? step.ms : 0);
    };

    tick();
  }, []);

  const finishAndMaybeAuto = useCallback(() => {
    setLocked(false);
    setPhase("idle");
    const sess = sessionRef.current;
    if (sess.inFree && sess.sessionId && sess.freeSpinsLeft > 0) {
      timerRef.current = setTimeout(() => startSpinRef.current(), turboRef.current ? 120 : 420);
      return;
    }
    if (autoRef.current && !sess.inFree) {
      autoTimerRef.current = setTimeout(() => startSpinRef.current(), turboRef.current ? 180 : 550);
    }
  }, []);

  const startSpin = useCallback(async () => {
    if (locked) return;
    setLocked(true);
    setSpinGoldMult(0);
    setLastWin(0);
    setWinKeys([]);
    setGoldKeys([]);
    setTransformKeys([]);
    setRemoveKeys([]);
    setBanner(null);
    setWinPopup(null);
    // Start reel blur immediately (like Fire Spike / Frontier Gold)
    setSpinId((n) => n + 1);
    setPhase("spinning");
    clearTimer();
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    try {
      const sess = sessionRef.current;
      let result: Awaited<ReturnType<typeof pinataWinsSpinFn>>;

      if (sess.inFree && sess.sessionId) {
        result = await pinataWinsFreeSpinFn({ data: { sessionId: sess.sessionId } });
      } else {
        result = await pinataWinsSpinFn({ data: { bet: betRef.current } });
      }

      if (!mountedRef.current) return;
      setBalanceLocal(result.balance);
      applySession({
        sessionId: result.session.sessionId,
        freeSpinsLeft: result.session.freeSpinsLeft,
        fsSessionWin: result.session.fsSessionWin,
        persistentMult: result.session.persistentMult,
        inFree: result.session.inFree,
        bet: result.session.bet,
      });

      if (result.script.freeSpinsAwarded > 0 && !sess.inFree) {
        setBanner(`Fiesta Free Spins · ${result.script.freeSpinsAwarded}!`);
      }
      if (result.fsPayout) {
        toast.success(`Free Spins paid ${formatMoney(result.fsPayout.amount)}`);
      }

      // Buy returns empty steps — jump straight into FS playback loop
      if (!result.script.steps.length && result.session.inFree) {
        setPhase("idle");
        setLocked(false);
        setBanner("Fiesta Free Spins!");
        timerRef.current = setTimeout(() => startSpinRef.current(), 500);
        return;
      }

      playScript(result.script, finishAndMaybeAuto);
    } catch (e) {
      setLocked(false);
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "Spin failed");
      setAutoSpin(false);
    }
  }, [finishAndMaybeAuto, locked, playScript, setBalanceLocal]);

  startSpinRef.current = () => void startSpin();

  const buyFeature = async () => {
    if (locked) return;
    setBuyOpen(false);
    setLocked(true);
    try {
      const result = await pinataWinsBuyFeatureFn({ data: { bet: betRef.current } });
      if (!mountedRef.current) return;
      setBalanceLocal(result.balance);
      applySession({
        sessionId: result.session.sessionId,
        freeSpinsLeft: result.session.freeSpinsLeft,
        fsSessionWin: result.session.fsSessionWin,
        persistentMult: result.session.persistentMult,
        inFree: result.session.inFree,
        bet: result.session.bet,
      });
      setBanner("Feature Buy · Fiesta Free Spins!");
      setLocked(false);
      timerRef.current = setTimeout(() => startSpinRef.current(), 600);
    } catch (e) {
      setLocked(false);
      toast.error(e instanceof Error ? e.message : "Buy failed");
    }
  };

  const betIdx = BET_STEPS.findIndex((b) => b >= bet);
  const canBetChange = !locked && !session.inFree;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #9a3412 0%, #1c0a0a 42%, #07040a 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] sm:opacity-25"
        style={{
          backgroundImage: "url(/games/pinata-wins.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Mobile-first full-bleed shell — reels eat the screen */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[90rem] flex-col px-0 py-0 sm:px-3 sm:py-2">
        {/* Title only on larger screens — frees phone height */}
        <header className="hidden shrink-0 text-center leading-tight sm:block">
          <h1 className="text-lg font-black tracking-wide text-amber-200 drop-shadow sm:text-xl">
            Piñata Wins
          </h1>
        </header>

        {/* Compact stats bar */}
        <div className="mt-0 grid w-full shrink-0 grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-none border-x-0 border-b border-t border-white/15 bg-black/70 sm:mt-1 sm:rounded-lg sm:border">
          <div className="px-1 py-1.5 text-center sm:px-2 sm:py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-white/50 sm:text-[10px]">Balance</div>
            <div className="truncate text-sm font-bold tabular-nums sm:text-base">
              {formatMoney(balance)}
            </div>
          </div>
          <div className="px-1 py-1.5 text-center sm:px-2 sm:py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-white/50 sm:text-[10px]">Bet</div>
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                disabled={!canBetChange}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-base font-bold leading-none disabled:opacity-40 sm:h-8 sm:w-8"
                onClick={() => setBet(BET_STEPS[Math.max(0, (betIdx < 0 ? 0 : betIdx) - 1)]!)}
              >
                −
              </button>
              <span className="min-w-0 truncate text-sm font-bold tabular-nums sm:text-base">
                {formatMoney(bet)}
              </span>
              <button
                type="button"
                disabled={!canBetChange}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-base font-bold leading-none disabled:opacity-40 sm:h-8 sm:w-8"
                onClick={() =>
                  setBet(BET_STEPS[Math.min(BET_STEPS.length - 1, (betIdx < 0 ? 0 : betIdx) + 1)]!)
                }
              >
                +
              </button>
            </div>
          </div>
          <div className="px-1 py-1.5 text-center sm:px-2 sm:py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-white/50 sm:text-[10px]">Win</div>
            <div className="truncate text-sm font-bold tabular-nums text-emerald-300 sm:text-base">
              {formatMoney(lastWin)}
            </div>
          </div>
        </div>

        {(session.inFree || session.persistentMult > 0) && (
          <div className="grid w-full shrink-0 grid-cols-3 divide-x divide-amber-400/20 overflow-hidden rounded-none border-x-0 border-b border-amber-400/40 bg-gradient-to-r from-amber-900/80 to-rose-900/70 sm:mt-1 sm:rounded-lg sm:border">
            <div className="px-1 py-1 text-center">
              <div className="text-[9px] uppercase tracking-wider text-amber-200/75">Fiesta ×</div>
              <div className="text-base font-black tabular-nums text-amber-300 sm:text-lg">
                {session.persistentMult > 0 ? `${session.persistentMult}x` : "—"}
              </div>
            </div>
            <div className="px-1 py-1 text-center">
              <div className="text-[9px] uppercase tracking-wider text-amber-200/75">Spins</div>
              <div className="text-base font-black tabular-nums text-amber-100 sm:text-lg">
                {session.freeSpinsLeft}
              </div>
            </div>
            <div className="px-1 py-1 text-center">
              <div className="text-[9px] uppercase tracking-wider text-amber-200/75">Bonus</div>
              <div className="truncate text-sm font-bold tabular-nums text-amber-100 sm:text-base">
                {formatMoney(session.fsSessionWin)}
              </div>
            </div>
          </div>
        )}

        {spinGoldMult > 0 && !session.inFree && (
          <div className="w-full shrink-0 border-b border-yellow-500/35 bg-black/50 px-2 py-0.5 text-center text-sm font-semibold text-yellow-300 sm:mt-1 sm:rounded-md sm:border">
            Gold Frames · {spinGoldMult}x
          </div>
        )}

        {/*
          Mobile: full-bleed stretch (no aspect shrink → no side gutters / logo void).
          sm+: centered 5×3 aspect board.
        */}
        <div className="relative min-h-0 w-full flex-1">
          <div className="absolute inset-0 flex items-stretch justify-center sm:items-center">
            <div
              className="pw-reel-board relative h-full w-full"
              style={
                {
                  ["--pw-cols" as string]: cfgSnap.reelsCount,
                  ["--pw-rows" as string]: cfgSnap.rowsCount,
                } as CSSProperties
              }
            >
              <BanderitasBorder
                className="size-full rounded-none shadow-none sm:rounded-2xl sm:shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                flagCount={14}
                tight
              >
                <div
                  className="grid size-full gap-0.5 p-0.5 sm:gap-1 sm:p-1"
                  style={{
                    gridTemplateColumns: `repeat(${cfgSnap.reelsCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${cfgSnap.rowsCount}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: cfgSnap.rowsCount }, (_, row) =>
                    Array.from({ length: cfgSnap.reelsCount }, (_, reel) => {
                      const cell = grid[reel]?.[row] ?? makeCell("chili");
                      const key = cellKey(reel, row);
                      const isWin = winKeys.includes(key);
                      return (
                        <div key={key} className="min-h-0 min-w-0">
                          <ReelCell
                            cell={cell}
                            phase={phase}
                            reel={reel}
                            row={row}
                            spinId={spinId}
                            winning={isWin}
                            goldPulse={goldKeys.includes(key)}
                            transformPulse={transformKeys.includes(key)}
                            removing={removeKeys.includes(key)}
                            dimmed={
                              (winKeys.length > 0 || goldKeys.length > 0) &&
                              !isWin &&
                              !goldKeys.includes(key) &&
                              !transformKeys.includes(key)
                            }
                          />
                        </div>
                      );
                    }),
                  )}
                </div>
                <WinModal popup={winPopup} />
              </BanderitasBorder>
            </div>
          </div>

          {banner && !winPopup ? (
            <div className="pointer-events-none absolute bottom-1 left-1/2 z-20 max-w-[90%] -translate-x-1/2 truncate rounded-full border border-amber-400/40 bg-black/75 px-3 py-0.5 text-sm font-semibold text-amber-200 shadow">
              {banner}
            </div>
          ) : null}

          <style>{`
            @media (min-width: 640px) {
              .pw-reel-board {
                width: min(100%, calc((100dvh - 9rem) * var(--pw-cols) / var(--pw-rows)));
                height: auto;
                max-height: 100%;
                aspect-ratio: var(--pw-cols) / var(--pw-rows);
              }
            }
          `}</style>
        </div>

        {/* Controls — full width, safe-area aware */}
        <div
          className="w-full shrink-0 space-y-1 bg-gradient-to-t from-black/80 to-black/40 px-1.5 pt-1 sm:bg-transparent sm:px-0"
          style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        >
          <div className="grid w-full grid-cols-3 gap-1 sm:gap-1.5">
            <button
              type="button"
              className={cn(
                "rounded-lg py-2.5 text-sm font-bold transition sm:py-2",
                turbo ? "bg-amber-500 text-black" : "bg-white/10 text-white/80",
              )}
              onClick={() => setTurbo((t) => !t)}
            >
              Turbo
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg py-2.5 text-sm font-bold transition sm:py-2",
                autoSpin ? "bg-emerald-500 text-black" : "bg-white/10 text-white/80",
              )}
              onClick={() => setAutoSpin((a) => !a)}
              disabled={session.inFree}
            >
              Auto
            </button>
            <button
              type="button"
              disabled={locked || session.inFree}
              className="rounded-lg bg-rose-600/90 py-2.5 text-sm font-bold disabled:opacity-40 sm:py-2"
              onClick={() => setBuyOpen(true)}
            >
              Buy {cfgSnap.buyFeatureMult}x
            </button>
          </div>

          <button
            type="button"
            disabled={locked && !session.inFree}
            onClick={() => void startSpin()}
            className="block w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 py-3.5 text-lg font-black tracking-[0.18em] shadow-lg transition enabled:hover:brightness-110 disabled:opacity-50 sm:py-3.5 sm:text-xl"
          >
            {session.inFree ? `FREE SPIN (${session.freeSpinsLeft})` : locked ? "…" : "SPIN"}
          </button>
        </div>
      </div>

      {buyOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[42rem] rounded-2xl border border-amber-400/40 bg-[#1a0b10] p-6 text-center shadow-2xl sm:max-w-[48rem] sm:p-8">
            <h3 className="text-xl font-bold text-amber-200 sm:text-2xl">Buy Fiesta Free Spins</h3>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Pay <span className="font-semibold text-amber-300">{cfgSnap.buyFeatureMult}x</span> your
              bet ({formatMoney(bet * cfgSnap.buyFeatureMult)}) to enter Free Spins with the
              persistent Gold Frame multiplier.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl bg-white/10 py-3 text-sm font-medium"
                onClick={() => setBuyOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-rose-600 py-3 text-sm font-semibold"
                onClick={() => void buyFeature()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <span className="hidden">{ANIM.winFade}</span>
    </div>
  );
}
