/**
 * Pug Den slot UI — plays back server-resolved SpinScript.
 * Non-authoritative: all outcomes come from pugLifeSpinFn / pugLifeBuyFeatureFn.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import {
  getPugLifeEngineConfigFn,
  pugLifeBuyFeatureFn,
  pugLifeSpinFn,
} from "@/functions/api";
import { useAuth } from "@/lib/auth";
import {
  isBonusBuyAllowed,
  PUG_LIFE_GAME_ID,
  type PugLifeConfig,
} from "@/lib/pug-life-config";
import { cn } from "@/lib/utils";
import { ANIM, BET_STEPS, STAGE_BG_SRC, SYM_LABEL } from "./pug-life/animationConfig";
import { BuyFeatureModal, type BuyId } from "./pug-life/BuyFeatureModal";
import { PaytableModal } from "./pug-life/PaytableModal";
import { ReelCell, type ReelPhase } from "./pug-life/ReelCell";
import { getPugLifeConfig, setPugLifeConfig } from "./pug-life/runtimeConfig";
import type { PaylineWin, PlCell, PlGrid, SpinScript } from "./pug-life/types";
import { cellKey } from "./pug-life/types";

function idleGrid(): PlGrid {
  const cfg = getPugLifeConfig();
  const kinds = ["sym_10", "sym_j", "sym_q", "sym_k", "sym_a", "rat", "pigeon", "cat"] as const;
  const heights =
    cfg.reelHeights?.length === cfg.reelsCount
      ? cfg.reelHeights
      : Array.from({ length: cfg.reelsCount }, () => cfg.rowsCount);
  return Array.from({ length: cfg.reelsCount }, (_, reel) =>
    Array.from({ length: heights[reel] ?? cfg.rowsCount }, (_, row) => ({
      kind: kinds[(reel + row) % kinds.length]!,
    })),
  );
}

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Connecting-ways win summary for the overlay modal. */
function formatWaysSubtitle(wins: PaylineWin[]): string {
  if (!wins.length) return "";
  const totalWays = wins.reduce((a, w) => a + (w.waysCount ?? 1), 0);
  const top = [...wins]
    .sort((a, b) => b.payout - a.payout)
    .slice(0, 2)
    .map((w) => {
      const label = SYM_LABEL[w.symbol] ?? w.symbol;
      const ways = w.waysCount ?? 1;
      return `${w.count} reels · ${label} · ${ways} way${ways === 1 ? "" : "s"}`;
    });
  const treatMax = Math.max(0, ...wins.map((w) => w.combinedTreatMult));
  const bits = [
    `${totalWays} connecting way${totalWays === 1 ? "" : "s"}`,
    ...top,
  ];
  if (treatMax > 1) bits.push(`Treat ×${treatMax}`);
  return bits.join(" · ");
}

type WinModalState = {
  title: string;
  amount?: number;
  subtitle?: string;
  tone?: "win" | "bonus" | "pot";
};

type Props = {
  gameId?: string;
  gameName?: string;
  /** Regulatory market for bonus-buy gating (e.g. UK). */
  marketCode?: string | null;
};

export function PugLifeSlot({
  gameId = PUG_LIFE_GAME_ID,
  gameName = "Pug Den",
  marketCode = null,
}: Props) {
  const { user, setBalanceLocal } = useAuth();
  const balance = user?.balance ?? 0;

  const [bet, setBet] = useState(1);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [cfgSnap, setCfgSnap] = useState<PugLifeConfig>(() => getPugLifeConfig());
  const [phase, setPhase] = useState<ReelPhase>("idle");
  const [spinId, setSpinId] = useState(0);
  const [grid, setGrid] = useState<PlGrid>(idleGrid);
  const [winKeys, setWinKeys] = useState<string[]>([]);
  const [winModal, setWinModal] = useState<WinModalState | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [potDisplay, setPotDisplay] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const runIdRef = useRef(0);
  const lockedRef = useRef(false);
  const mountedRef = useRef(true);
  const autoRef = useRef(autoSpin);
  const turboRef = useRef(turbo);
  const betRef = useRef(bet);
  const startSpinRef = useRef<() => void>(() => undefined);

  autoRef.current = autoSpin;
  turboRef.current = turbo;
  betRef.current = bet;

  const buyAllowed = isBonusBuyAllowed(marketCode, cfgSnap);
  const ms = (n: number) => (turboRef.current ? Math.round(n * ANIM.turboFactor) : n);

  useEffect(() => {
    mountedRef.current = true;
    void getPugLifeEngineConfigFn()
      .then((cfg) => {
        if (!mountedRef.current) return;
        setPugLifeConfig(cfg);
        setCfgSnap(getPugLifeConfig());
      })
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const playScript = useCallback(async (script: SpinScript, runId: number) => {
    setSpinId((n) => n + 1);
    setPhase("spinning");
    setWinKeys([]);
    setWinModal(null);
    setPotDisplay(null);
    await wait(ms(ANIM.spinMs));
    if (runId !== runIdRef.current) return;

    setGrid(script.grid);
    setPhase("stopping");
    const liveCfg = getPugLifeConfig();
    const landWait = ANIM.landMs + ANIM.reelStagger * (liveCfg.reelsCount - 1) + 35 * 3;
    await wait(ms(landWait));
    if (runId !== runIdRef.current) return;

    if (script.paylineWins.length > 0) {
      const keys = script.paylineWins.flatMap((w) =>
        w.positions.map(([r, row]) => cellKey(r, row)),
      );
      setWinKeys(keys);
      setPhase("win");
      setWinModal({
        title: "WIN",
        amount: script.paylineWin,
        subtitle: formatWaysSubtitle(script.paylineWins),
        tone: "win",
      });
      await wait(ms(ANIM.winHold));
      if (runId !== runIdRef.current) return;
    }

    // Bonus playback
    if (script.bonusSession?.type === "treat_yoself") {
      setWinModal({
        title: "TREAT YO'SELF!",
        subtitle: "Sticky Treats · lives & free spins",
        tone: "bonus",
      });
      await wait(ms(800));
      for (const step of script.bonusSession.steps) {
        if (runId !== runIdRef.current) return;
        setSpinId((n) => n + 1);
        setPhase("spinning");
        await wait(ms(ANIM.bonusStepMs));
        setGrid(step.grid);
        setPhase("stopping");
        await wait(ms(ANIM.landMs + ANIM.reelStagger * 2));
        setPhase(step.spinWin > 0 ? "win" : "idle");
        const keys = step.paylineWins.flatMap((w) =>
          w.positions.map(([r, row]) => cellKey(r, row)),
        );
        setWinKeys(keys);
        const waysSub =
          step.paylineWins.length > 0 ? formatWaysSubtitle(step.paylineWins) : undefined;
        setWinModal({
          title: "TREAT YO'SELF",
          amount: step.spinWin > 0 ? step.spinWin : undefined,
          subtitle: [
            `Spins ${step.spinsRemainingAfter}`,
            `Lives ${step.livesRemainingAfter}`,
            step.newStickyTreats.length ? `+${step.newStickyTreats.length} Treat` : null,
            waysSub,
          ]
            .filter(Boolean)
            .join(" · "),
          tone: "bonus",
        });
        await wait(ms(ANIM.winHold));
      }
    } else if (script.bonusSession?.type === "dawgs_den") {
      setWinModal({
        title: "DAWG'S DEN",
        subtitle: `${script.bonusSession.freeSpinsAwarded} free spins · pot builds each spin`,
        tone: "bonus",
      });
      setPotDisplay(0);
      await wait(ms(900));
      for (const step of script.bonusSession.steps) {
        if (runId !== runIdRef.current) return;
        setSpinId((n) => n + 1);
        setPhase("spinning");
        await wait(ms(ANIM.bonusStepMs));
        setGrid(step.grid);
        setPhase("stopping");
        await wait(ms(ANIM.landMs + ANIM.reelStagger * 2));
        setPhase("idle");
        setPotDisplay(step.potAfter);
        const toastBits = step.toasterReveals
          .map((t) =>
            t.reveal.type === "cash"
              ? `🍞 ${t.reveal.value}× bet`
              : `🍞 ×${t.reveal.value}`,
          )
          .join(" · ");
        const waysSub =
          step.paylineWins.length > 0 ? formatWaysSubtitle(step.paylineWins) : undefined;
        setWinModal({
          title: "DAWG'S DEN POT",
          amount: step.potAfter,
          subtitle: [
            `Spins left ${step.spinsRemainingAfter}`,
            toastBits || null,
            waysSub,
          ]
            .filter(Boolean)
            .join(" · "),
          tone: "pot",
        });
        await wait(ms(ANIM.winHold));
      }
      setWinModal({
        title: "DAWG'S DEN PAYS",
        amount: script.bonusSession.totalWin,
        subtitle: "Lump-sum pot settlement",
        tone: "pot",
      });
      await wait(ms(1400));
    }

    setLastWin(script.totalWin);
    if (script.hitCap) {
      setWinModal({
        title: "MAX WIN CAP",
        amount: script.totalWin,
        subtitle: `${getPugLifeConfig().maxWinMult}× stake cap applied`,
        tone: "win",
      });
    } else if (script.totalWin > 0 && !script.bonusSession) {
      setWinModal({
        title: "TOTAL",
        amount: script.totalWin,
        subtitle:
          script.paylineWins.length > 0
            ? formatWaysSubtitle(script.paylineWins)
            : undefined,
        tone: "win",
      });
      await wait(ms(900));
    }
    setWinKeys([]);
    setWinModal(null);
    setPotDisplay(null);
    setPhase("idle");
    setLocked(false);
    lockedRef.current = false;
  }, []);

  const startSpin = useCallback(async () => {
    if (lockedRef.current) return;
    if (betRef.current > balance) {
      toast.error("Insufficient balance");
      setAutoSpin(false);
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    const runId = ++runIdRef.current;

    try {
      const result = await pugLifeSpinFn({ data: { bet: betRef.current } });
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setBalanceLocal(result.balance);
      await playScript(result.script, runId);
      if (autoRef.current && mountedRef.current) {
        setTimeout(() => startSpinRef.current(), ms(400));
      }
    } catch (e) {
      lockedRef.current = false;
      setLocked(false);
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "Spin failed");
      setAutoSpin(false);
    }
  }, [balance, playScript, setBalanceLocal]);

  startSpinRef.current = () => void startSpin();

  const doBuy = async (buyId: BuyId) => {
    if (lockedRef.current) return;
    if (!buyAllowed) {
      toast.error("Bonus buy unavailable in your market");
      return;
    }
    const option = cfgSnap.buyOptions.find((b) => b.id === buyId);
    const costMult = option?.costMult ?? 0;
    if (!option?.enabled || costMult <= 0) {
      toast.error("This buy option is not available yet");
      return;
    }
    const cost = +(betRef.current * costMult).toFixed(2);
    if (cost > balance) {
      toast.error("Insufficient balance");
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    setBuyOpen(false);
    const runId = ++runIdRef.current;
    try {
      const result = await pugLifeBuyFeatureFn({
        data: { bet: betRef.current, buyId, marketCode },
      });
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setBalanceLocal(result.balance);
      await playScript(result.script, runId);
      if (autoRef.current && mountedRef.current) {
        setTimeout(() => startSpinRef.current(), ms(400));
      }
    } catch (e) {
      lockedRef.current = false;
      setLocked(false);
      toast.error(e instanceof Error ? e.message : "Buy failed");
    }
  };

  const cycleBet = (dir: 1 | -1) => {
    if (locked) return;
    const idx = BET_STEPS.findIndex((b) => b >= bet);
    const cur = idx < 0 ? 0 : idx;
    const next = BET_STEPS[Math.min(BET_STEPS.length - 1, Math.max(0, cur + dir))]!;
    setBet(next);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden text-amber-50">
      <style>{`
        @keyframes pd-reel-scroll-kf {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes pd-reel-land-kf {
          from { transform: translateY(-110%); opacity: 0.4; filter: blur(2px); }
          to { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes pd-win-pulse-kf {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.18); }
        }
        .pd-reel-scroll { animation: pd-reel-scroll-kf 0.18s linear infinite; will-change: transform; }
        .pd-reel-land { animation: pd-reel-land-kf 0.38s ease-out both; }
        .pd-win-pulse { animation: pd-win-pulse-kf 0.5s ease-in-out 2; }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${STAGE_BG_SRC})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1a0f08]/55 via-[#0c0a09]/45 to-[#1c1917]/75" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(12,10,9,0.55)_100%)]" />

      {/* Top bar — MaxHigh, title + info, balance all centered */}
      <div className="relative z-10 flex shrink-0 flex-col items-center justify-center gap-1.5 px-4 py-3 sm:gap-2 sm:px-6 sm:py-4">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-500/80">MaxHigh</div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-center font-black text-2xl tracking-tight text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-3xl md:text-4xl">
            {gameName}
          </h1>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="mt-0.5 flex size-8 items-center justify-center rounded-full border-2 border-amber-400/70 bg-amber-500/25 text-amber-50 shadow-lg shadow-amber-900/40 hover:bg-amber-500/40"
            title="How to Win"
            aria-label="How to Win"
          >
            <Info className="size-4" />
          </button>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/45 px-4 py-1.5 text-center text-sm backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-wider text-amber-500/70">Balance</div>
          <div className="font-bold tabular-nums">{formatMoney(balance)}</div>
        </div>
      </div>

      {/* Win / bonus overlay — absolute so diamond layout never shifts */}
      {winModal && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4">
          <div
            className={cn(
              "pointer-events-none w-full max-w-sm animate-in fade-in zoom-in-95 rounded-3xl border-2 px-5 py-5 text-center shadow-2xl backdrop-blur-md duration-200",
              winModal.tone === "pot"
                ? "border-orange-400/60 bg-orange-950/85"
                : winModal.tone === "bonus"
                  ? "border-pink-400/55 bg-[#2a1520]/90"
                  : "border-amber-400/60 bg-black/80",
            )}
            role="status"
            aria-live="polite"
          >
            <div
              className={cn(
                "text-[11px] font-black uppercase tracking-[0.22em]",
                winModal.tone === "pot"
                  ? "text-orange-300"
                  : winModal.tone === "bonus"
                    ? "text-pink-200"
                    : "text-amber-300",
              )}
            >
              {winModal.title}
            </div>
            {winModal.amount != null && (
              <div
                className={cn(
                  "mt-1 text-3xl font-black tabular-nums sm:text-4xl",
                  winModal.tone === "pot" ? "text-orange-100" : "text-amber-50",
                )}
              >
                {formatMoney(winModal.amount)}
              </div>
            )}
            {winModal.subtitle && (
              <div className="mt-2 text-[11px] leading-snug text-amber-100/75 sm:text-xs">
                {winModal.subtitle}
              </div>
            )}
            {potDisplay != null && winModal.tone === "pot" && (
              <div className="mt-2 text-[10px] uppercase tracking-wider text-orange-300/70">
                Paid as lump sum at bonus end
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diamond reels — 3-4-5-4-3 circles fill phone width */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-1 py-1 sm:px-2">
        <div className="flex w-full max-w-6xl items-center justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5">
          {(cfgSnap.reelHeights?.length === cfgSnap.reelsCount
            ? cfgSnap.reelHeights
            : Array.from({ length: cfgSnap.reelsCount }, () => cfgSnap.rowsCount)
          ).map((height, reel) => (
            <div
              key={reel}
              className="flex w-[19%] max-w-[9.5rem] flex-col justify-center gap-1 sm:max-w-[10.5rem] sm:gap-1.5 md:max-w-[11.5rem] md:gap-2"
            >
              {Array.from({ length: height }, (_, row) => {
                const cell: PlCell = grid[reel]?.[row] ?? { kind: "sym_10" };
                return (
                  <ReelCell
                    key={`${reel}-${row}`}
                    cell={cell}
                    phase={phase}
                    reel={reel}
                    row={row}
                    spinId={spinId}
                    winning={winKeys.includes(cellKey(reel, row))}
                    sticky={cell.sticky}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-auto shrink-0 border-t border-white/10 bg-black/55 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[9rem] items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              disabled={locked}
              onClick={() => cycleBet(-1)}
              className="grid size-10 place-items-center rounded-xl bg-white/10 text-lg font-black disabled:opacity-40"
            >
              −
            </button>
            <div className="min-w-[5rem] text-center">
              <div className="text-[10px] uppercase tracking-wider text-amber-500/60">Bet</div>
              <div className="font-bold tabular-nums">{formatMoney(bet)}</div>
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={() => cycleBet(1)}
              className="grid size-10 place-items-center rounded-xl bg-white/10 text-lg font-black disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={locked}
            onClick={() => void startSpin()}
            className={cn(
              "rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-10 py-3 text-sm font-black uppercase tracking-wide text-black shadow-lg sm:px-12 sm:text-base",
              locked && "opacity-50",
            )}
          >
            {locked ? "…" : "Spin"}
          </button>

          <div className="flex min-w-[9rem] items-center justify-center gap-2 text-xs sm:justify-end">
            <button
              type="button"
              onClick={() => setTurbo((t) => !t)}
              className={cn(
                "rounded-lg px-3 py-2",
                turbo ? "bg-amber-500 text-black" : "bg-white/10",
              )}
            >
              Turbo
            </button>
            <button
              type="button"
              onClick={() => setAutoSpin((a) => !a)}
              className={cn(
                "rounded-lg px-3 py-2",
                autoSpin ? "bg-emerald-500 text-black" : "bg-white/10",
              )}
            >
              Auto
            </button>
            {buyAllowed && (
              <button
                type="button"
                disabled={locked}
                onClick={() => setBuyOpen(true)}
                className="rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-500/35 to-orange-700/35 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-50 disabled:opacity-40"
              >
                Buy
              </button>
            )}
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-gradient-to-b from-amber-500/30 to-orange-600/30 px-3 py-2 text-amber-50 hover:from-amber-500/45 hover:to-orange-600/45"
              title="How to Win · Paytable"
              aria-label="How to Win / Info"
            >
              <Info className="size-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider">Info</span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-4xl justify-between text-[10px] text-amber-500/50">
          <span>Last win {formatMoney(lastWin)}</span>
          <span>
            {cfgSnap.targetRtp}% RTP · max {cfgSnap.maxWinMult}× · {gameId}
          </span>
        </div>
      </div>

      <BuyFeatureModal
        open={buyOpen && buyAllowed}
        bet={bet}
        balance={balance}
        locked={locked}
        onBetChange={setBet}
        onBuy={(id) => void doBuy(id)}
        onClose={() => setBuyOpen(false)}
      />
      <PaytableModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
