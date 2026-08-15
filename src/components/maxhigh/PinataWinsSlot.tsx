/**
 * PiÃ±ata Wins slot UI â€” replays server-resolved cascade / Gold Frame / FS scripts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
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
            subtitle: `+${step.delta}x â†’ ${step.total}x`,
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
        setBanner(`Fiesta Free Spins Â· ${result.script.freeSpinsAwarded}!`);
      }
      if (result.fsPayout) {
        toast.success(`Free Spins paid ${formatMoney(result.fsPayout.amount)}`);
      }

      // Buy returns empty steps â€” jump straight into FS playback loop
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
      setBanner("Feature Buy Â· Fiesta Free Spins!");
      setLocked(false);
      timerRef.current = setTimeout(() => startSpinRef.current(), 600);
    } catch (e) {
      setLocked(false);
      toast.error(e instanceof Error ? e.message : "Buy failed");
    }
  };

  const betIdx = BET_STEPS.findIndex((b) => b >= bet);
  const canBetChange = !locked && !session.inFree;
  const cols = cfgSnap.reelsCount;
  const rows = cfgSnap.rowsCount;
  const buyCost = bet * cfgSnap.buyFeatureMult;
  const displayWin = session.inFree ? session.fsSessionWin : lastWin;
  const currentMult = session.inFree ? session.persistentMult : spinGoldMult;

  const nudgeBet = (dir: -1 | 1) => {
    if (!canBetChange) return;
    const i = betIdx < 0 ? 0 : betIdx;
    const next = BET_STEPS[Math.max(0, Math.min(BET_STEPS.length - 1, i + dir))];
    if (next != null) setBet(next);
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden text-white select-none">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #9a3412 0%, #1c0a0a 42%, #07040a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "url(/games/pinata-wins.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,220,180,0.12) 0%, rgba(190,24,93,0.28) 40%, rgba(69,10,26,0.72) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex h-full max-h-full w-full max-w-[1600px] flex-col items-center gap-1.5 sm:gap-2">
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-2 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
            <div className="hidden h-full min-w-0 items-center justify-end sm:flex">
              <div className="flex w-full flex-col items-stretch justify-center gap-2.5">
                {session.inFree ? (
                  <>
                    <div
                      className="w-full rounded-[1.2rem] p-[4px]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF6C8 0%,#FECACA 35%,#FB7185 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{ background: "linear-gradient(180deg,#e11d48 0%,#9f1239 100%)" }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Fiesta Ã—
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          {currentMult > 0 ? `${currentMult}x` : "â€”"}
                        </div>
                      </div>
                    </div>
                    <div
                      className="w-full rounded-[1.2rem] p-[4px]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF6C8 0%,#FECACA 35%,#FB7185 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{ background: "linear-gradient(180deg,#f97316 0%,#c2410c 100%)" }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Total Win
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          {formatMoney(session.fsSessionWin)}
                        </div>
                      </div>
                    </div>
                    <div
                      className="w-full rounded-[1.2rem] p-[4px]"
                      style={{
                        background:
                          "linear-gradient(180deg,#FFF6C8 0%,#FECACA 35%,#FB7185 65%,#F5D76E 100%)",
                      }}
                    >
                      <div
                        className="rounded-[1rem] px-3 py-2.5 text-center"
                        style={{ background: "linear-gradient(180deg,#a21caf 0%,#701a75 100%)" }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                          Free Spins
                        </div>
                        <div className="text-xl font-black tabular-nums leading-tight text-[#F5D76E]">
                          {session.freeSpinsLeft}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setBuyOpen(true)}
                    className="rounded-2xl border-[3px] border-[#F5D76E]/95 px-2 py-2.5 text-center shadow-[0_8px_22px_rgba(225,29,72,0.45)] transition hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(180deg,#fb7185 0%,#e11d48 48%,#9f1239 100%)",
                    }}
                  >
                    <div className="text-[10px] font-black uppercase leading-tight tracking-wide text-white">
                      Buy Free Spins
                    </div>
                    <div className="mt-0.5 text-[1.35rem] font-black leading-none tabular-nums text-[#F5D76E] lg:text-[1.5rem]">
                      {formatMoney(buyCost)}
                    </div>
                    <div className="mt-0.5 text-[10px] font-black uppercase text-white/80">
                      {cfgSnap.buyFeatureMult}x bet
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex h-full min-h-0 min-w-0 w-full flex-col items-center">
              <div
                className="flex h-full min-h-0 max-h-full flex-col"
                style={{
                  width: `min(100%, calc((100dvh - 12rem) * ${cols} / ${rows}))`,
                }}
              >
                <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1.5">
                  <div
                    className="mx-auto flex shrink-0 items-center gap-2 rounded-full px-3 py-0.5 shadow-[0_8px_22px_rgba(212,160,23,0.45)] sm:px-4"
                    style={{
                      background:
                        "linear-gradient(180deg,#FFF3B0 0%,#F5D76E 25%,#D4A017 70%,#B8860B 100%)",
                      border: "2px solid #9f1239",
                    }}
                  >
                    <span
                      className="text-xs font-black tracking-wide sm:text-sm"
                      style={{
                        color: "#4c0519",
                        textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                      }}
                    >
                      PiÃ±ata Wins
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#9f1239]/80 sm:text-[10px]">
                      {cols}Ã—{rows}
                    </span>
                  </div>

                  {(currentMult > 0 || session.inFree) && (
                    <div className="flex shrink-0 items-center justify-center gap-2.5">
                      <span className="text-base font-black italic text-[#F5D76E] drop-shadow-[0_0_12px_rgba(250,204,21,0.9)] sm:text-xl">
                        {currentMult > 0 ? `x${currentMult}` : "Fiesta"}
                      </span>
                    </div>
                  )}

                  <div
                    className="relative w-full shrink-0"
                    style={{ aspectRatio: `${cols} / ${rows}` }}
                  >
                    <BanderitasBorder
                      className="size-full rounded-[0.85rem] shadow-[0_18px_50px_rgba(225,29,72,0.35)] sm:rounded-[1.1rem]"
                      flagCount={14}
                      tight
                    >
                      <div
                        className="grid size-full gap-0.5 p-0.5 sm:gap-1 sm:p-1"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: rows }, (_, row) =>
                          Array.from({ length: cols }, (_, reel) => {
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

                    {banner && !winPopup ? (
                      <div className="pointer-events-none absolute bottom-1 left-1/2 z-20 max-w-[90%] -translate-x-1/2 truncate rounded-full border border-amber-400/40 bg-black/75 px-3 py-0.5 text-sm font-semibold text-amber-200 shadow">
                        {banner}
                      </div>
                    ) : null}
                  </div>

                  {!session.inFree && (
                    <div className="flex shrink-0 justify-center gap-2 sm:hidden">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setBuyOpen(true)}
                        className="rounded-lg border-2 border-[#E8C547] bg-gradient-to-b from-[#fb7185] to-[#9f1239] px-3 py-1.5 text-[10px] font-black uppercase text-white"
                      >
                        Buy FS {formatMoneyCompact(buyCost)}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="mt-1 w-full shrink-0 rounded-xl p-[2px] shadow-[0_8px_24px_rgba(159,18,57,0.45)] sm:mt-1.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #FFF6C8 0%, #FECACA 35%, #FB7185 65%, #F5D76E 100%)",
                  }}
                >
                  <div
                    className="flex flex-col gap-1.5 rounded-[10px] px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-1.5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(190,24,93,0.94) 0%, rgba(136,19,55,0.96) 55%, rgba(69,10,26,0.98) 100%)",
                    }}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1.5 sm:justify-start sm:gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setBuyOpen(true)}
                          disabled={locked || session.inFree}
                          className="grid size-6 shrink-0 place-items-center rounded-full border border-[#E8C547]/80 bg-[#4c0519] text-[#F5D76E] transition hover:brightness-110 disabled:opacity-40 sm:size-7"
                          aria-label="Buy feature"
                        >
                          <Menu size={12} />
                        </button>
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0 font-black tracking-wide sm:gap-x-3">
                          <div className="whitespace-nowrap text-[10px] sm:text-xs">
                            <span className="uppercase text-[#F5D76E]/85">Credit </span>
                            <span className="tabular-nums text-[#F5D76E]">{formatMoney(balance)}</span>
                          </div>
                          <div className="whitespace-nowrap text-[10px] sm:text-xs">
                            <span className="uppercase text-[#F5D76E]/85">Bet </span>
                            <span className="tabular-nums text-[#F5D76E]">{formatMoney(bet)}</span>
                          </div>
                          <div className="whitespace-nowrap text-[10px] sm:text-xs">
                            <span className="uppercase text-[#F5D76E]/85">Win </span>
                            <span className="tabular-nums text-[#F5D76E]">{formatMoney(displayWin)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTurbo((t) => !t)}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition sm:hidden",
                          turbo
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#4c0519]"
                            : "border-[#E8C547]/80 bg-[#4c0519] text-[#F5D76E]",
                        )}
                        aria-pressed={turbo}
                      >
                        <Zap size={10} />
                        Turbo
                      </button>
                    </div>

                    <div className="hidden flex-1 items-center justify-center sm:flex">
                      <button
                        type="button"
                        onClick={() => setTurbo((t) => !t)}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition",
                          turbo
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#4c0519]"
                            : "border-[#E8C547]/80 bg-[#4c0519] text-[#F5D76E]",
                        )}
                        aria-pressed={turbo}
                      >
                        <Zap size={10} />
                        Turbo
                      </button>
                    </div>

                    <div className="flex w-full flex-col items-center gap-0.5 sm:w-auto">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canBetChange}
                          onClick={() => nudgeBet(-1)}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547] text-base font-black text-white shadow disabled:opacity-40 sm:size-9"
                          style={{ background: "linear-gradient(180deg,#e11d48 0%,#9f1239 100%)" }}
                          aria-label="Decrease bet"
                        >
                          âˆ’
                        </button>

                        <button
                          type="button"
                          disabled={locked && !session.inFree}
                          onClick={() => void startSpin()}
                          className="relative grid size-12 place-items-center rounded-full border-[3px] border-[#E8C547] shadow-[0_6px_18px_rgba(212,160,23,0.4)] disabled:opacity-60 sm:size-14"
                          style={{
                            background:
                              "radial-gradient(circle at 35% 28%, #fb923c 0%, #e11d48 42%, #4c0519 100%)",
                          }}
                          aria-label="Spin"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className={cn(
                              "size-6 text-[#F5D76E] sm:size-7",
                              locked && "animate-spin",
                            )}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                          >
                            <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
                            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          disabled={!canBetChange}
                          onClick={() => nudgeBet(1)}
                          className="grid size-8 place-items-center rounded-full border-2 border-[#E8C547] text-base font-black text-white shadow disabled:opacity-40 sm:size-9"
                          style={{ background: "linear-gradient(180deg,#e11d48 0%,#9f1239 100%)" }}
                          aria-label="Increase bet"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={session.inFree}
                        onClick={() => setAutoSpin((a) => !a)}
                        className={cn(
                          "rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-wider sm:text-[10px]",
                          autoSpin
                            ? "border-[#E8C547] bg-gradient-to-b from-[#FFF3B0] to-[#D4A017] text-[#4c0519]"
                            : "border-[#E8C547]/80 bg-[#4c0519] text-[#F5D76E]",
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

      {buyOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[42rem] rounded-2xl border border-amber-400/40 bg-[#1a0b10] p-6 text-center shadow-2xl sm:max-w-[48rem] sm:p-8">
            <h3 className="text-xl font-bold text-amber-200 sm:text-2xl">Buy Fiesta Free Spins</h3>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Pay <span className="font-semibold text-amber-300">{cfgSnap.buyFeatureMult}x</span> your
              bet ({formatMoney(buyCost)}) to enter Free Spins with the persistent Gold Frame
              multiplier.
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
