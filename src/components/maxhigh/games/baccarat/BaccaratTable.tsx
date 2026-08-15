import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { baccaratDealFn, getBaccaratEngineConfigFn } from "@/functions/baccarat";
import {
  BACCARAT_GAME_ID,
  DEFAULT_BACCARAT_CONFIG,
  type BaccaratConfig,
} from "@/lib/baccarat-config";
import { cn } from "@/lib/utils";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { CardCell } from "./CardCell";
import { BaccaratIcon } from "./BaccaratIcon";
import { playBaccaratSound, unlockBaccaratAudio } from "./audio";
import {
  getBaccaratAnim,
  preloadBaccaratCriticalAssets,
  type BcAnimProfile,
  type BcBetSpot,
} from "./animationConfig";
import { getBaccaratConfig, setBaccaratConfig } from "./runtimeConfig";
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

/** Desktop side-rail when wide enough AND tall enough (avoids landscape phones). */
function useBcDesktopRail() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 1024px) and (min-height: 560px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px) and (min-height: 560px)").matches,
    () => false,
  );
}

type FaceKeys = "p0" | "p1" | "p2" | "b0" | "b1" | "b2";

function HandPanel({
  side,
  total,
  cards,
  faceDown,
  win,
}: {
  side: "player" | "banker";
  total: number | null;
  cards: (PlayingCard | null)[];
  faceDown: Record<FaceKeys, boolean>;
  win: boolean;
}) {
  const isPlayer = side === "player";
  const keys: FaceKeys[] = isPlayer ? ["p0", "p1", "p2"] : ["b0", "b1", "b2"];
  const hasThird = Boolean(cards[2]);

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col items-center gap-1.5 overflow-hidden rounded-3xl border-2 px-1.5 py-2 short-h:gap-1 short-h:rounded-2xl short-h:py-1.5 sm:gap-2 sm:rounded-2xl sm:border sm:px-3 sm:py-3",
        isPlayer
          ? win
            ? "border-sky-300/90 bg-sky-950/60 shadow-[0_0_24px_rgba(56,189,248,0.28)]"
            : "border-sky-400/40 bg-sky-950/30"
          : win
            ? "border-rose-300/90 bg-rose-950/60 shadow-[0_0_24px_rgba(244,63,94,0.28)]"
            : "border-rose-400/40 bg-rose-950/30",
      )}
    >
      <div className="flex w-full shrink-0 items-center justify-between gap-1.5 px-1">
        <span
          className={cn(
            "text-[12px] font-extrabold tracking-[0.18em] short-h:text-[10px] sm:text-xs",
            isPlayer ? "text-sky-300" : "text-rose-300",
          )}
        >
          {isPlayer ? "PLAYER" : "BANKER"}
        </span>
        <span
          className={cn(
            "grid h-9 min-w-9 place-items-center rounded-full border-2 px-2 text-lg font-black tabular-nums short-h:h-7 short-h:min-w-7 short-h:border short-h:text-sm sm:h-9 sm:min-w-9 sm:text-base",
            win
              ? isPlayer
                ? "border-sky-100 bg-sky-400 text-slate-950"
                : "border-rose-100 bg-rose-400 text-slate-950"
              : isPlayer
                ? "border-sky-500/50 bg-sky-950/80 text-sky-50"
                : "border-rose-500/50 bg-rose-950/80 text-rose-50",
          )}
        >
          {total ?? "–"}
        </span>
      </div>

      {/* min-w-0 + overlapping third card so 3 cards fit ≤320px hand width */}
      <div className="flex min-h-0 min-w-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div
          className={cn(
            "flex max-w-full items-center justify-center",
            hasThird
              ? "-space-x-3 short-h:-space-x-2.5 sm:-space-x-1.5 sm:gap-0"
              : "gap-1.5 sm:gap-1.5",
          )}
        >
          <CardCell
            card={cards[0]}
            faceDown={faceDown[keys[0]!]}
            size="lg"
            side={side}
            highlight={win}
            className="short-h:w-[clamp(2.1rem,9vw,2.8rem)]"
          />
          <CardCell
            card={cards[1]}
            faceDown={faceDown[keys[1]!]}
            size="lg"
            side={side}
            highlight={win}
            className="short-h:w-[clamp(2.1rem,9vw,2.8rem)]"
          />
          {hasThird ? (
            <CardCell
              card={cards[2]}
              faceDown={faceDown[keys[2]!]}
              size="sm"
              side={side}
              highlight={win}
              className="relative z-[1] short-h:w-[clamp(1.85rem,8vw,2.4rem)] sm:w-[clamp(2.5rem,4.5vw,3.4rem)]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-first Baccarat shell with desktop side betting rail.
 * Single BettingPanel instance — dock on portrait, rail on lg+ tall.
 */
export function BaccaratTable({
  gameId = BACCARAT_GAME_ID,
  gameName = "Baccarat",
  onBalance,
}: Props) {
  void gameId;
  const rail = useBcDesktopRail();
  const animRef = useRef<BcAnimProfile>(getBaccaratAnim());
  const [cfg, setCfg] = useState<BaccaratConfig>(() => getBaccaratConfig());
  const [playerBet, setPlayerBet] = useState(0);
  const [bankerBet, setBankerBet] = useState(DEFAULT_BACCARAT_CONFIG.minBankerBet);
  const [tieBet, setTieBet] = useState(0);
  const [playerPairBet, setPlayerPairBet] = useState(0);
  const [bankerPairBet, setBankerPairBet] = useState(0);
  const [activeSpot, setActiveSpot] = useState<BcBetSpot>("banker");
  const [busy, setBusy] = useState(false);
  const [playerCards, setPlayerCards] = useState<(PlayingCard | null)[]>([null, null]);
  const [bankerCards, setBankerCards] = useState<(PlayingCard | null)[]>([null, null]);
  const [faceDown, setFaceDown] = useState<Record<FaceKeys, boolean>>({
    p0: true,
    p1: true,
    p2: true,
    b0: true,
    b1: true,
    b2: true,
  });
  const [playerTotal, setPlayerTotal] = useState<number | null>(null);
  const [bankerTotal, setBankerTotal] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"player" | "banker" | "tie" | null>(null);
  const [banner, setBanner] = useState("Place your bets");
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
    animRef.current = getBaccaratAnim();
    preloadBaccaratCriticalAssets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getBaccaratEngineConfigFn();
        if (cancelled) return;
        setBaccaratConfig(remote);
        setCfg(remote);
        setBankerBet(remote.minBankerBet);
      } catch {
        setCfg(DEFAULT_BACCARAT_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onChipPlaced(_ev: ChipPlaceEvent) {
    unlockBaccaratAudio();
    playBaccaratSound("chip");
  }

  function onClearSpot(_spot: BcBetSpot) {
    /* amounts live in bet state / dock */
  }

  async function flipSlot(slot: FaceKeys) {
    const anim = animRef.current;
    setFaceDown((prev) => ({ ...prev, [slot]: false }));
    playBaccaratSound("flip");
    await sleep(anim.flipDuration);
  }

  async function playDealReveal(script: PublicDealScript) {
    const anim = animRef.current;
    setOutcome(null);
    setPlayerCards(script.playerCards);
    setBankerCards(script.bankerCards);
    setPlayerTotal(null);
    setBankerTotal(null);
    setFaceDown({
      p0: true,
      p1: true,
      p2: true,
      b0: true,
      b1: true,
      b2: true,
    });
    setBanner("Dealing…");
    playBaccaratSound("deal");
    await sleep(anim.dealStagger);

    await flipSlot("p0");
    await sleep(anim.cardStagger);
    await flipSlot("b0");
    await sleep(anim.cardStagger);
    await flipSlot("p1");
    await sleep(anim.cardStagger);
    await flipSlot("b1");

    if (script.natural) {
      setBanner(`Natural ${script.outcome === "tie" ? "tie" : script.outcome}!`);
    } else {
      if (script.playerDrew && script.playerCards[2]) {
        await sleep(anim.thirdCardPause);
        setBanner("Player draws…");
        await flipSlot("p2");
      }
      if (script.bankerDrew && script.bankerCards[2]) {
        await sleep(anim.thirdCardPause);
        setBanner("Banker draws…");
        await flipSlot("b2");
      }
    }

    setPlayerTotal(script.playerTotal);
    setBankerTotal(script.bankerTotal);
    setOutcome(script.outcome);
    await sleep(anim.resultHold / 3);

    const credit = script.immediateCredit;
    setLastCredit(credit);

    if (script.outcome === "tie") {
      setBanner("Tie — main bets push");
      playBaccaratSound("tie");
    } else if (script.outcome === "player") {
      const big = credit >= (playerBet + bankerBet + tieBet) * 5;
      setBanner(big ? "PLAYER BIG WIN!" : "Player wins");
      playBaccaratSound(big ? "bigWin" : "win");
    } else {
      const big = credit >= (playerBet + bankerBet + tieBet) * 5;
      setBanner(big ? "BANKER BIG WIN!" : "Banker wins");
      if (script.bankerWin > 0 && cfg.bankerCommission > 0) {
        playBaccaratSound("commission");
      }
      playBaccaratSound(big ? "bigWin" : "win");
    }

    if (script.playerPair || script.bankerPair) {
      const parts: string[] = [];
      if (script.playerPair) parts.push("P Pair");
      if (script.bankerPair) parts.push("B Pair");
      setBanner((prev) => `${prev} · ${parts.join(" + ")}`);
    }
  }

  async function onDeal() {
    if (busy) return;
    const total = playerBet + bankerBet + tieBet + playerPairBet + bankerPairBet;
    if (total <= 0) {
      toast.error("Place at least one bet");
      return;
    }
    if (playerBet > 0 && playerBet < cfg.minPlayerBet) {
      toast.error(`Player min ₱${cfg.minPlayerBet}`);
      return;
    }
    if (bankerBet > 0 && bankerBet < cfg.minBankerBet) {
      toast.error(`Banker min ₱${cfg.minBankerBet}`);
      return;
    }
    unlockBaccaratAudio();
    setBusy(true);
    setLastCredit(0);
    try {
      const res = await baccaratDealFn({
        data: { playerBet, bankerBet, tieBet, playerPairBet, bankerPairBet },
      });
      syncBalance(res.balance);
      await playDealReveal(res.script);
      setTieBet(0);
      setPlayerPairBet(0);
      setBankerPairBet(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deal failed");
      setBanner("Place your bets");
      setOutcome(null);
      setFaceDown({
        p0: true,
        p1: true,
        p2: true,
        b0: true,
        b1: true,
        b2: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const pWin = outcome === "player";
  const bWin = outcome === "banker";
  const tWin = outcome === "tie";

  const betting = (
    <BettingPanel
      cfg={cfg}
      playerBet={playerBet}
      bankerBet={bankerBet}
      tieBet={tieBet}
      playerPairBet={playerPairBet}
      bankerPairBet={bankerPairBet}
      disabled={busy}
      onPlayerBet={setPlayerBet}
      onBankerBet={setBankerBet}
      onTieBet={setTieBet}
      onPlayerPairBet={setPlayerPairBet}
      onBankerPairBet={setBankerPairBet}
      activeSpot={activeSpot}
      onActiveSpot={setActiveSpot}
      onChipPlaced={onChipPlaced}
      onClearSpot={onClearSpot}
      onDeal={() => void onDeal()}
      dealBusy={busy}
      layout={rail ? "rail" : "dock"}
    />
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none touch-manipulation text-[#e8eef8] select-none">
      <div className="pointer-events-none absolute inset-0 bg-[#030b14]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_22%,_#1a4570_0%,_#0a1c34_42%,_#030a12_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(56,189,248,0.08),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(244,63,94,0.07),_transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      </div>

      {/* Centered stage on desktop; column on mobile */}
      <div
        className={cn(
          "relative z-10 mx-auto flex h-full min-h-0 w-full flex-col",
          "bc-rail:max-w-6xl bc-rail:flex-row bc-rail:gap-4 bc-rail:px-4 bc-rail:py-3",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative flex shrink-0 items-center gap-2.5 pr-14 pl-3 pt-[max(0.4rem,env(safe-area-inset-top))] short-h:gap-1.5 short-h:pt-1 sm:pr-16 sm:pl-4 sm:pt-3 bc-rail:pr-4">
            <BaccaratIcon size={28} className="short-h:size-6 sm:size-7" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[1.05rem] font-extrabold tracking-[0.14em] text-[#e8c96a] uppercase short-h:text-[0.85rem] sm:text-sm">
                {gameName}
              </div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-sky-200/55 uppercase short-h:hidden sm:text-[9px]">
                Punto Banco
              </div>
            </div>
            {balance != null && (
              <div className="shrink-0 rounded-2xl border border-[#c9a227]/45 bg-[#0a1628]/95 px-3.5 py-1.5 text-base font-bold tabular-nums text-[#f5e6c8] short-h:rounded-lg short-h:px-2.5 short-h:py-1 short-h:text-[13px] sm:rounded-lg sm:px-3.5 sm:text-sm">
                ₱{balance.toFixed(2)}
              </div>
            )}
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col gap-2 px-2.5 py-2 short-h:gap-1.5 short-h:px-2 short-h:py-1 sm:gap-3 sm:px-4 sm:py-3 bc-rail:px-0">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "shrink-0 rounded-2xl border-2 px-3.5 py-2.5 text-center short-h:rounded-xl short-h:border short-h:px-2.5 short-h:py-1.5 sm:rounded-xl sm:border sm:py-3",
                tWin
                  ? "border-emerald-300/70 bg-emerald-950/60"
                  : pWin
                    ? "border-sky-300/70 bg-sky-950/50"
                    : bWin
                      ? "border-rose-300/70 bg-rose-950/50"
                      : "border-[#c9a227]/35 bg-[#0a1628]/90",
              )}
            >
              <div className="text-[11px] font-extrabold tracking-[0.22em] text-[#c9a227] short-h:text-[9px] sm:text-[10px]">
                RESULT
              </div>
              <div className="mt-1 line-clamp-2 text-lg font-bold leading-snug text-white short-h:mt-0.5 short-h:text-[15px] sm:text-lg">
                {banner}
              </div>
              {lastCredit > 0 && !busy ? (
                <div className="mt-1 text-lg font-black text-emerald-300 short-h:mt-0.5 short-h:text-sm sm:text-base">
                  +₱{lastCredit.toFixed(2)}
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 gap-2 short-h:gap-1.5 sm:gap-3">
              <HandPanel
                side="player"
                total={playerTotal}
                cards={playerCards}
                faceDown={faceDown}
                win={pWin}
              />
              <HandPanel
                side="banker"
                total={bankerTotal}
                cards={bankerCards}
                faceDown={faceDown}
                win={bWin}
              />
            </div>
          </div>
        </div>

        {/* Single BettingPanel: bottom dock (mobile) or right rail (desktop) */}
        <div
          className={cn(
            "relative shrink-0 border-[#c9a227]/25 bg-[#060d18]/98",
            "border-t px-3 pt-2.5 pb-[max(0.55rem,env(safe-area-inset-bottom))] short-h:px-2.5 short-h:pt-1.5 short-h:pb-[max(0.35rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-2.5 sm:pb-3",
            "bc-rail:w-[min(100%,22rem)] bc-rail:shrink-0 bc-rail:self-stretch bc-rail:border-t-0 bc-rail:border-l bc-rail:rounded-2xl bc-rail:px-3 bc-rail:py-3 bc-rail:pb-3",
          )}
        >
          {betting}
        </div>
      </div>
    </div>
  );
}
