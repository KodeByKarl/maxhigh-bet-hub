import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { colorGameProDealFn, getColorGameProEngineConfigFn } from "@/functions/color-game-pro";
import {
  COLOR_GAME_PRO_GAME_ID,
  COLOR_SPOT_IDS,
  DEFAULT_COLOR_GAME_PRO_CONFIG,
  type ColorGameProConfig,
  type ColorSpotId,
} from "@/lib/color-game-pro-config";
import { cn } from "@/lib/utils";
import { playColorGameProSound, unlockColorGameProAudio } from "./audio";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { getColorGameProConfig, setColorGameProConfig } from "./runtimeConfig";
import type { PublicDealScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

function emptyBets(): Record<ColorSpotId, number> {
  return Object.fromEntries(COLOR_SPOT_IDS.map((id) => [id, 0])) as Record<ColorSpotId, number>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Color Game Pro — colorful felt + chip pads + CSS wheel/ball reveal.
 */
export function ColorGameProTable({
  gameId = COLOR_GAME_PRO_GAME_ID,
  gameName = "Color Game Pro",
  onBalance,
}: Props) {
  void gameId;
  const [cfg, setCfg] = useState<ColorGameProConfig>(() => getColorGameProConfig());
  const [bets, setBets] = useState<Record<ColorSpotId, number>>(emptyBets);
  const [activeSpot, setActiveSpot] = useState<ColorSpotId>("red");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [wheelDeg, setWheelDeg] = useState(0);
  const [winning, setWinning] = useState<ColorSpotId | null>(null);
  const [banner, setBanner] = useState("Tap a color · chip up · SPIN");
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
        const remote = await getColorGameProEngineConfigFn();
        if (cancelled) return;
        setColorGameProConfig(remote);
        setCfg(remote);
      } catch {
        setCfg(DEFAULT_COLOR_GAME_PRO_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onBet(spot: ColorSpotId, n: number) {
    setBets((prev) => ({ ...prev, [spot]: n }));
  }

  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockColorGameProAudio();
    playColorGameProSound("chip");
  }

  function clearAll() {
    setBets(emptyBets());
    setWinning(null);
    setLastCredit(0);
    setBanner("Tap a color · chip up · SPIN");
  }

  async function playReveal(script: PublicDealScript) {
    setSpinning(true);
    playColorGameProSound("deal", 0.45);
    const idx = cfg.spots.findIndex((s) => s.id === script.winningColor);
    const slice = 360 / Math.max(1, cfg.spots.length);
    const target = 360 * 4 + (360 - idx * slice - slice / 2);
    setWheelDeg((d) => d + target);
    await sleep(2200);
    setWinning(script.winningColor);
    setSpinning(false);
    setLastCredit(script.immediateCredit);
    if (script.immediateCredit > 0) {
      playColorGameProSound("win");
      setBanner(`WIN ${script.winningColor.toUpperCase()} · +₱${script.immediateCredit.toFixed(2)}`);
    } else {
      playColorGameProSound("lose", 0.4);
      setBanner(`${script.winningColor.toUpperCase()} · no hit`);
    }
  }

  async function onDeal() {
    const total = +cfg.spots.reduce((s, sp) => s + (bets[sp.id] ?? 0), 0).toFixed(2);
    if (total < cfg.minBet) {
      toast.error(`Min total bet ₱${cfg.minBet}`);
      return;
    }
    unlockColorGameProAudio();
    setBusy(true);
    setWinning(null);
    setBanner("Spinning…");
    try {
      const res = await colorGameProDealFn({ data: { bets } });
      syncBalance(res.balance);
      await playReveal(res.script);
      setBets(emptyBets());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spin failed");
      setBanner("Tap a color · chip up · SPIN");
    } finally {
      setBusy(false);
    }
  }

  const slice = 360 / Math.max(1, cfg.spots.length);
  const conic = cfg.spots
    .map((sp, i) => `${sp.hex} ${i * slice}deg ${(i + 1) * slice}deg`)
    .join(", ");

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0b1220] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 20%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(236,72,153,0.12), transparent 50%)",
        }}
      />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.45rem,env(safe-area-inset-top))] pr-14 sm:pr-4">
        <div className="min-w-0">
          <div className="truncate text-[1.05rem] font-black tracking-[0.12em] text-amber-300 uppercase">
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
            Perya colors · {cfg.spots[0]?.payoutMult ?? 5.5}×
          </div>
        </div>
        {balance != null && (
          <div className="rounded-2xl border border-white/20 bg-black/50 px-3 py-1.5 text-base font-bold tabular-nums">
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      {/* Wheel stage — fills leftover height, optically centered like slot reels */}
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-3 py-1">
        <div
          className="relative mx-auto aspect-square shrink-0"
          style={{
            width: "min(90vw, calc(100dvh - 18rem), 26rem)",
          }}
        >
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[22%]">
            <div className="h-0 w-0 border-x-[11px] border-t-[20px] border-x-transparent border-t-[#F5D76E] drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]" />
          </div>

          <div
            className="absolute inset-0 rounded-full p-[7px] shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-[9px]"
            style={{
              background:
                "linear-gradient(145deg, #FFF6C8 0%, #F5D76E 28%, #D4A017 58%, #B8860B 100%)",
            }}
          >
            <div className="relative size-full overflow-hidden rounded-full bg-[#071018]">
              <div
                className={cn(
                  "absolute inset-[2.5%] rounded-full transition-transform duration-[2200ms] ease-out",
                  spinning && "brightness-110",
                )}
                style={{
                  background: `conic-gradient(${conic})`,
                  transform: `rotate(${wheelDeg}deg)`,
                }}
              >
                {cfg.spots.map((sp, i) => {
                  const mid = i * slice + slice / 2;
                  const darkText = sp.id === "white" || sp.id === "yellow";
                  return (
                    <div
                      key={sp.id}
                      className="pointer-events-none absolute inset-0"
                      style={{ transform: `rotate(${mid}deg)` }}
                    >
                      <span
                        className="absolute left-1/2 top-[11%] -translate-x-1/2 text-[0.65rem] font-black uppercase tracking-wide sm:text-xs"
                        style={{
                          color: darkText ? "#0f172a" : "#fff",
                          textShadow: darkText
                            ? "0 1px 0 rgba(255,255,255,0.45)"
                            : "0 1px 2px rgba(0,0,0,0.55)",
                        }}
                      >
                        {sp.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-[31%] z-10 flex items-center justify-center rounded-full border-2 border-amber-300/75 bg-[#0b1220] shadow-[inset_0_8px_18px_rgba(0,0,0,0.45)]">
                {winning ? (
                  <span
                    className="text-center text-sm font-black uppercase tracking-wider sm:text-base"
                    style={{ color: cfg.spots.find((s) => s.id === winning)?.hex }}
                  >
                    {winning}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">
                    Spin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 rounded-full px-4 py-1.5 text-center text-sm font-bold tracking-wide",
            lastCredit > 0 ? "bg-emerald-500/25 text-emerald-200" : "bg-black/40 text-white/80",
          )}
        >
          {banner}
        </div>
      </div>

      <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-sm">
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
