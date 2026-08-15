import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { luckyNinePlusDealFn, getLuckyNinePlusEngineConfigFn } from "@/functions/lucky-nine-plus";
import {
  LUCKY_NINE_PLUS_GAME_ID,
  DEFAULT_LUCKY_NINE_PLUS_CONFIG,
  type LuckyNinePlusConfig,
} from "@/lib/lucky-nine-plus-config";
import { cn } from "@/lib/utils";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { CardCell } from "./CardCell";
import { playLuckyNinePlusSound, unlockLuckyNinePlusAudio } from "./audio";
import {
  getLuckyNinePlusAnim,
  preloadLuckyNinePlusCriticalAssets,
  type L9AnimProfile,
  type L9BetSpot,
} from "./animationConfig";
import { getLuckyNinePlusConfig, setLuckyNinePlusConfig } from "./runtimeConfig";
import type { PlayingCard } from "./deckEngine";
import type { PublicDealScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type FaceKeys = "p0" | "p1" | "p2" | "d0" | "d1" | "d2";

function CardFan({
  side,
  cards,
  faceDown,
  keys,
  win,
}: {
  side: "player" | "dealer";
  cards: (PlayingCard | null)[];
  faceDown: Record<FaceKeys, boolean>;
  keys: FaceKeys[];
  win: boolean;
}) {
  const hasThird = Boolean(cards[2]);
  const tilt = side === "dealer" ? [-8, 0, 8] : [-10, 0, 10];

  return (
    <div
      className={cn(
        "flex items-end justify-center",
        hasThird ? "-space-x-3.5 short-h:-space-x-3 sm:-space-x-2" : "gap-1.5 sm:gap-1.5",
      )}
    >
      {keys.map((key, i) => {
        const card = cards[i];
        if (i === 2 && !hasThird) return null;
        return (
          <div
            key={key}
            className="origin-bottom transition-transform"
            style={{ transform: `rotate(${tilt[i] ?? 0}deg)` }}
          >
            <CardCell
              card={card}
              faceDown={faceDown[key]}
              size={i === 2 ? "sm" : "lg"}
              side={side}
              highlight={win}
              className={
                side === "player"
                  ? "short-h:w-[clamp(2.2rem,9vw,2.9rem)]"
                  : "short-h:w-[clamp(2rem,8.5vw,2.7rem)]"
              }
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Lucky Nine Plus Arena — oval felt race-to-9.
 * Intentionally unlike Baccarat (no side-by-side panels, no RESULT box, no side rail).
 */
export function LuckyNinePlusTable({
  gameId = LUCKY_NINE_PLUS_GAME_ID,
  gameName = "Lucky Nine Plus",
  onBalance,
}: Props) {
  void gameId;
  const animRef = useRef<L9AnimProfile>(getLuckyNinePlusAnim());
  const [cfg, setCfg] = useState<LuckyNinePlusConfig>(() => getLuckyNinePlusConfig());
  const [playerBet, setPlayerBet] = useState(0);
  const [dealerBet, setDealerBet] = useState(DEFAULT_LUCKY_NINE_PLUS_CONFIG.minDealerBet);
  const [tieBet, setTieBet] = useState(0);
  const [activeSpot, setActiveSpot] = useState<L9BetSpot>("player");
  const [busy, setBusy] = useState(false);
  const [playerCards, setPlayerCards] = useState<(PlayingCard | null)[]>([null, null]);
  const [dealerCards, setDealerCards] = useState<(PlayingCard | null)[]>([null, null]);
  const [faceDown, setFaceDown] = useState<Record<FaceKeys, boolean>>({
    p0: true,
    p1: true,
    p2: true,
    d0: true,
    d1: true,
    d2: true,
  });
  const [playerTotal, setPlayerTotal] = useState<number | null>(null);
  const [dealerTotal, setDealerTotal] = useState<number | null>(null);
  const [playerNatural, setPlayerNatural] = useState(false);
  const [dealerNatural, setDealerNatural] = useState(false);
  const [outcome, setOutcome] = useState<"player" | "dealer" | "tie" | null>(null);
  const [banner, setBanner] = useState("Tap a spot · chip up · DEAL");
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
    animRef.current = getLuckyNinePlusAnim();
    preloadLuckyNinePlusCriticalAssets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getLuckyNinePlusEngineConfigFn();
        if (cancelled) return;
        setLuckyNinePlusConfig(remote);
        setCfg(remote);
        setDealerBet(remote.minDealerBet);
      } catch {
        setCfg(DEFAULT_LUCKY_NINE_PLUS_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockLuckyNinePlusAudio();
    playLuckyNinePlusSound("chip");
  }

  function clearAll() {
    if (busy) return;
    setPlayerBet(0);
    setDealerBet(0);
    setTieBet(0);
  }

  async function flipSlot(slot: FaceKeys) {
    const anim = animRef.current;
    setFaceDown((prev) => ({ ...prev, [slot]: false }));
    playLuckyNinePlusSound("flip");
    await sleep(anim.flipDuration);
  }

  async function playDealReveal(script: PublicDealScript) {
    const anim = animRef.current;
    setOutcome(null);
    setPlayerNatural(false);
    setDealerNatural(false);
    setPlayerCards(script.playerCards);
    setDealerCards(script.dealerCards);
    setPlayerTotal(null);
    setDealerTotal(null);
    setLastCredit(0);
    setFaceDown({
      p0: true,
      p1: true,
      p2: true,
      d0: true,
      d1: true,
      d2: true,
    });
    setBanner("Racing to 9…");
    playLuckyNinePlusSound("deal");
    await sleep(anim.dealStagger);

    await flipSlot("d0");
    await sleep(anim.cardStagger);
    await flipSlot("p0");
    await sleep(anim.cardStagger);
    await flipSlot("d1");
    await sleep(anim.cardStagger);
    await flipSlot("p1");

    if (script.natural) {
      setPlayerNatural(script.playerNatural);
      setDealerNatural(script.dealerNatural);
      setBanner(
        script.playerNatural && script.dealerNatural
          ? "DOUBLE NATURAL!"
          : script.playerNatural
            ? "NATURAL 9 — YOU"
            : "NATURAL 9 — DEALER",
      );
      playLuckyNinePlusSound("natural");
    }

    if (script.dealerDrew && script.dealerCards[2]) {
      await sleep(anim.thirdCardPause);
      setBanner("Dealer draws…");
      await flipSlot("d2");
    }
    if (script.playerDrew && script.playerCards[2]) {
      await sleep(anim.thirdCardPause);
      setBanner("You draw…");
      await flipSlot("p2");
    }

    setPlayerTotal(script.playerTotal);
    setDealerTotal(script.dealerTotal);
    setPlayerNatural(script.playerNatural);
    setDealerNatural(script.dealerNatural);
    setOutcome(script.outcome);
    await sleep(anim.resultHold / 3);

    const credit = script.immediateCredit;
    setLastCredit(credit);

    if (script.outcome === "tie") {
      setBanner("DEAD HEAT");
      playLuckyNinePlusSound("tie");
    } else if (script.outcome === "player") {
      setBanner(credit >= (playerBet + dealerBet + tieBet) * 5 ? "MEGA WIN" : "YOU WIN");
      playLuckyNinePlusSound(credit >= (playerBet + dealerBet + tieBet) * 5 ? "bigWin" : "win");
    } else {
      setBanner("DEALER WINS");
      playLuckyNinePlusSound(credit >= (playerBet + dealerBet + tieBet) * 5 ? "bigWin" : "win");
    }
  }

  async function onDeal() {
    if (busy) return;
    const total = playerBet + dealerBet + tieBet;
    if (total <= 0) {
      toast.error("Place at least one bet on the felt");
      return;
    }
    if (playerBet > 0 && playerBet < cfg.minPlayerBet) {
      toast.error(`Player min ₱${cfg.minPlayerBet}`);
      return;
    }
    if (dealerBet > 0 && dealerBet < cfg.minDealerBet) {
      toast.error(`Dealer min ₱${cfg.minDealerBet}`);
      return;
    }
    unlockLuckyNinePlusAudio();
    setBusy(true);
    try {
      const res = await luckyNinePlusDealFn({
        data: { playerBet, dealerBet, tieBet },
      });
      syncBalance(res.balance);
      await playDealReveal(res.script);
      setTieBet(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deal failed");
      setBanner("Tap a spot · chip up · DEAL");
      setOutcome(null);
      setFaceDown({
        p0: true,
        p1: true,
        p2: true,
        d0: true,
        d1: true,
        d2: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const pWin = outcome === "player";
  const dWin = outcome === "dealer";
  const tWin = outcome === "tie";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none touch-manipulation text-[#e8f8ef] select-none">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[#020806]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_#1a4d36_0%,_#0a1f16_45%,_#020806_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(201,162,39,0.14),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,_rgba(56,189,248,0.06),_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,_rgba(163,230,53,0.06),_transparent_40%)]" />
      </div>

      {/* Compact top chrome */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2.5 px-3 pt-[max(0.45rem,env(safe-area-inset-top))] pr-14 short-h:pt-1 sm:pr-4 sm:pt-2">
        <div className="min-w-0">
          <div
            className="truncate text-[1.15rem] font-black tracking-[0.1em] text-[#e8c96a] uppercase short-h:text-[0.9rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-lime-200/50 uppercase short-h:text-[9px]">
            Arena · closer to 9
          </div>
        </div>
        {balance != null && (
          <div className="rounded-2xl border border-[#c9a227]/45 bg-black/60 px-3.5 py-1.5 text-base font-bold tabular-nums text-[#f5e6c8] short-h:rounded-full short-h:px-3 short-h:py-1 short-h:text-[13px]">
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      {/* OVAL ARENA */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-2 py-1.5 short-h:py-0.5 sm:max-w-lg sm:px-4">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[45%_45%_42%_42%/28%_28%_32%_32%] border-[3px] border-[#c9a227]/50 bg-gradient-to-b from-[#0d3d2a] via-[#0a2a1c] to-[#061910] shadow-[inset_0_0_60px_rgba(0,0,0,0.55),0_0_40px_rgba(201,162,39,0.14)]">
          {/* Inner rail ring */}
          <div className="pointer-events-none absolute inset-3 rounded-[45%_45%_42%_42%/28%_28%_32%_32%] border border-[#e8c96a]/18" />

          {/* Center watermark 9 */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <span
              className={cn(
                "text-[7.5rem] font-black leading-none text-[#e8c96a]/[0.07] short-h:text-[5.5rem] sm:text-[9rem]",
                (pWin || dWin || tWin) && "text-[#e8c96a]/15",
              )}
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              9
            </span>
          </div>

          {/* DEALER zone — top of oval */}
          <div className="relative z-[1] flex shrink-0 flex-col items-center gap-1 pt-3.5 short-h:gap-0.5 short-h:pt-2 sm:pt-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-extrabold tracking-[0.24em] text-lime-300 short-h:text-[10px]">
                DEALER
              </span>
              {dealerNatural ? (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 short-h:px-1.5 short-h:text-[8px]">
                  NAT
                </span>
              ) : null}
            </div>
            <CardFan
              side="dealer"
              cards={dealerCards}
              faceDown={faceDown}
              keys={["d0", "d1", "d2"]}
              win={dWin}
            />
          </div>

          {/* Mid: score orbs + status over the 9 */}
          <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-3 short-h:gap-1.5">
            <div className="flex w-full max-w-xs items-center justify-between gap-2">
              <div
                className={cn(
                  "flex flex-col items-center",
                  pWin && "scale-110 transition",
                )}
              >
                <span className="text-[10px] font-extrabold tracking-widest text-sky-300 short-h:text-[8px]">
                  YOU
                </span>
                <div
                  className={cn(
                    "mt-0.5 grid size-14 place-items-center rounded-full border-[3px] text-[1.75rem] font-black tabular-nums short-h:size-11 short-h:border-2 short-h:text-xl",
                    pWin
                      ? "border-sky-100 bg-sky-400 text-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.55)]"
                      : "border-sky-400/55 bg-black/45 text-sky-50",
                  )}
                >
                  {playerTotal ?? "·"}
                </div>
              </div>

              <div className="min-w-0 flex-1 text-center">
                <div
                  className={cn(
                    "mx-auto max-w-[13rem] rounded-full px-3.5 py-1.5 text-sm font-extrabold tracking-wide short-h:max-w-[11rem] short-h:px-3 short-h:py-1 short-h:text-[11px]",
                    tWin
                      ? "bg-amber-400/95 text-slate-950"
                      : pWin
                        ? "bg-sky-400/95 text-slate-950"
                        : dWin
                          ? "bg-lime-400/95 text-slate-950"
                          : "bg-black/55 text-[#e8c96a]",
                  )}
                >
                  {banner}
                </div>
                {lastCredit > 0 && !busy ? (
                  <div className="mt-1.5 text-lg font-black text-emerald-300 short-h:mt-1 short-h:text-sm">
                    +₱{lastCredit.toFixed(2)}
                  </div>
                ) : (
                  <div className="mt-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase short-h:mt-1 short-h:text-[8px]">
                    Race to nine
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "flex flex-col items-center",
                  dWin && "scale-110 transition",
                )}
              >
                <span className="text-[10px] font-extrabold tracking-widest text-lime-300 short-h:text-[8px]">
                  HOUSE
                </span>
                <div
                  className={cn(
                    "mt-0.5 grid size-14 place-items-center rounded-full border-[3px] text-[1.75rem] font-black tabular-nums short-h:size-11 short-h:border-2 short-h:text-xl",
                    dWin
                      ? "border-lime-100 bg-lime-400 text-slate-950 shadow-[0_0_22px_rgba(163,230,53,0.55)]"
                      : "border-lime-400/55 bg-black/45 text-lime-50",
                  )}
                >
                  {dealerTotal ?? "·"}
                </div>
              </div>
            </div>

            {/* Progress ticks toward 9 */}
            <div className="flex w-full max-w-[15rem] items-center gap-0.5 px-1 short-h:max-w-[13rem]">
              {Array.from({ length: 10 }, (_, i) => {
                const pHit = playerTotal != null && i <= playerTotal;
                const dHit = dealerTotal != null && i <= dealerTotal;
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-sm transition-colors short-h:h-1.5",
                      i === 9
                        ? "bg-[#e8c96a]/85"
                        : pHit && dHit
                          ? "bg-gradient-to-r from-sky-400 to-lime-400"
                          : pHit
                            ? "bg-sky-400/85"
                            : dHit
                              ? "bg-lime-400/85"
                              : "bg-white/12",
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* PLAYER cards */}
          <div className="relative z-[1] flex shrink-0 flex-col items-center gap-1.5 pb-4 short-h:gap-1 short-h:pb-2.5 sm:pb-5">
            {playerNatural ? (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-950 short-h:px-1.5 short-h:py-0.5 short-h:text-[8px]">
                YOUR NATURAL
              </span>
            ) : (
              <span className="text-[12px] font-extrabold tracking-[0.24em] text-sky-300 short-h:text-[10px]">
                YOU
              </span>
            )}
            <CardFan
              side="player"
              cards={playerCards}
              faceDown={faceDown}
              keys={["p0", "p1", "p2"]}
              win={pWin}
            />
          </div>
        </div>
      </div>

      {/* Control deck — segmented spots + hex chips + GO FOR 9 */}
      <div className="relative z-20 shrink-0 bg-gradient-to-t from-[#020806] via-[#061410]/98 to-[#0a1f18]/95 px-3 pt-2.5 pb-[max(0.55rem,env(safe-area-inset-bottom))] short-h:px-2.5 short-h:pt-1.5 sm:px-4 sm:pt-2.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/55 to-transparent" />
        <BettingPanel
          cfg={cfg}
          playerBet={playerBet}
          dealerBet={dealerBet}
          tieBet={tieBet}
          disabled={busy}
          onPlayerBet={setPlayerBet}
          onDealerBet={setDealerBet}
          onTieBet={setTieBet}
          activeSpot={activeSpot}
          onActiveSpot={setActiveSpot}
          onChipPlaced={onChipPlaced}
          onClearAll={clearAll}
          onDeal={() => void onDeal()}
          dealBusy={busy}
        />
      </div>
    </div>
  );
}
