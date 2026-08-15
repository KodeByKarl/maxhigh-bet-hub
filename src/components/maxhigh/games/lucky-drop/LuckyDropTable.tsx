import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { luckyDropDealFn, getLuckyDropEngineConfigFn } from "@/functions/lucky-drop";
import {
  DEFAULT_LUCKY_DROP_CONFIG,
  LUCKY_DROP_GAME_ID,
  LUCKY_DROP_SPOTS,
  type LuckyDropConfig,
  type LuckyDropSpot,
} from "@/lib/lucky-drop-config";
import { cn } from "@/lib/utils";
import { playLuckyDropSound, unlockLuckyDropAudio } from "./audio";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { getLuckyDropConfig, setLuckyDropConfig } from "./runtimeConfig";
import type { PublicDealScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

function emptyBets(): Record<LuckyDropSpot, number> {
  return Object.fromEntries(LUCKY_DROP_SPOTS.map((n) => [n, 0])) as Record<
    LuckyDropSpot,
    number
  >;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Lucky Drop — vertical numbered lanes + ball drop reveal.
 */
export function LuckyDropTable({
  gameId = LUCKY_DROP_GAME_ID,
  gameName = "Lucky Drop",
  onBalance,
}: Props) {
  void gameId;
  const [cfg, setCfg] = useState<LuckyDropConfig>(() => getLuckyDropConfig());
  const [bets, setBets] = useState<Record<LuckyDropSpot, number>>(emptyBets);
  const [activeSpot, setActiveSpot] = useState<LuckyDropSpot>(1);
  const [busy, setBusy] = useState(false);
  const [ballY, setBallY] = useState(-8);
  const [winning, setWinning] = useState<LuckyDropSpot | null>(null);
  const [banner, setBanner] = useState("Pick 1–3 lanes · chip · DROP");
  const [lastCredit, setLastCredit] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);

  const syncBalance = useCallback(
    (n: number) => {
      setBalance(n);
      onBalance?.(n);
    },
    [onBalance],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getLuckyDropEngineConfigFn();
        if (cancelled) return;
        setLuckyDropConfig(remote);
        setCfg(remote);
      } catch {
        setCfg(DEFAULT_LUCKY_DROP_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onBet(spot: LuckyDropSpot, n: number) {
    setBets((prev) => ({ ...prev, [spot]: n }));
  }

  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockLuckyDropAudio();
    playLuckyDropSound("chip");
  }

  function clearAll() {
    setBets(emptyBets());
    setWinning(null);
    setLastCredit(0);
    setBallY(-8);
    setBanner("Pick 1–3 lanes · chip · DROP");
  }

  async function playReveal(script: PublicDealScript) {
    playLuckyDropSound("deal", 0.45);
    setBallY(-8);
    setWinning(null);
    // Animate drop into lane (CSS top %)
    const targetPct = 8 + ((script.winningNumber - 1) / 9) * 84;
    await sleep(80);
    setBallY(targetPct);
    await sleep(1100);
    setWinning(script.winningNumber);
    setLastCredit(script.immediateCredit);
    if (script.immediateCredit > 0) {
      playLuckyDropSound("win");
      setBanner(`HIT ${script.winningNumber} · +₱${script.immediateCredit.toFixed(2)}`);
    } else {
      playLuckyDropSound("lose", 0.4);
      setBanner(`Dropped ${script.winningNumber} · miss`);
    }
  }

  async function onDeal() {
    const total = +LUCKY_DROP_SPOTS.reduce((s, n) => s + (bets[n] ?? 0), 0).toFixed(2);
    if (total < cfg.minBet) {
      toast.error(`Min total bet ₱${cfg.minBet}`);
      return;
    }
    unlockLuckyDropAudio();
    setBusy(true);
    setBanner("Dropping…");
    try {
      const res = await luckyDropDealFn({ data: { bets } });
      syncBalance(res.balance);
      await playReveal(res.script);
      setBets(emptyBets());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Drop failed");
      setBanner("Pick 1–3 lanes · chip · DROP");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#071018] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 10%, rgba(34,211,238,0.16), transparent 55%), linear-gradient(180deg, #0a1a24 0%, #071018 60%)",
        }}
      />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.45rem,env(safe-area-inset-top))] pr-14 sm:pr-4">
        <div className="min-w-0">
          <div className="truncate text-[1.05rem] font-black tracking-[0.12em] text-cyan-300 uppercase">
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
            Instant drop · {cfg.payoutMult}×
          </div>
        </div>
        {balance != null && (
          <div className="rounded-2xl border border-cyan-400/30 bg-black/50 px-3 py-1.5 text-base font-bold tabular-nums">
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[22rem] flex-1 flex-col px-3 py-2">
        <div className="relative mx-auto flex h-[min(48vh,16rem)] w-full max-w-[14rem] overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-slate-900/80 to-slate-950 shadow-inner">
          <div className="flex w-full flex-col">
            {LUCKY_DROP_SPOTS.map((n) => {
              const hit = winning === n;
              const staked = (bets[n] ?? 0) > 0;
              return (
                <div
                  key={n}
                  className={cn(
                    "relative flex flex-1 items-center border-b border-white/5 px-3 last:border-b-0",
                    hit && "bg-cyan-400/25",
                    staked && !hit && "bg-amber-400/10",
                  )}
                >
                  <span className="w-6 text-sm font-black tabular-nums text-white/80">{n}</span>
                  <div className="ml-2 h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_16px_rgba(251,191,36,0.8)] transition-[top] duration-1000 ease-in"
            style={{ top: `${ballY}%` }}
          />
        </div>

        <div
          className={cn(
            "mt-3 rounded-full px-4 py-1.5 text-center text-sm font-bold",
            lastCredit > 0 ? "bg-emerald-500/25 text-emerald-200" : "bg-black/40 text-white/80",
          )}
        >
          {banner}
        </div>
      </div>

      <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/45 backdrop-blur-sm">
        <BettingPanel
          cfg={cfg}
          bets={bets}
          disabled={busy}
          activeSpot={activeSpot}
          onActiveSpot={setActiveSpot}
          onBet={onBet}
          onChipPlaced={onChipPlaced}
          onClearAll={clearAll}
          onDeal={() => void onDeal()}
          dealBusy={busy}
        />
      </div>
    </div>
  );
}
