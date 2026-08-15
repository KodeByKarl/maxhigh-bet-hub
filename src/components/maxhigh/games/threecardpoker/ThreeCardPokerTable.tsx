import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  threeCardPokerDealFn,
  threeCardPokerPlayFn,
  threeCardPokerFoldFn,
  getThreeCardPokerEngineConfigFn,
  getThreeCardPokerSessionFn,
} from "@/functions/threecardpoker";
import {
  THREE_CARD_POKER_GAME_ID,
  DEFAULT_THREE_CARD_POKER_CONFIG,
  type ThreeCardPokerConfig,
} from "@/lib/threecardpoker-config";
import { cn } from "@/lib/utils";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { BetSpot } from "./BetSpot";
import { CardCell } from "./CardCell";
import { ArcRule, FeltSurface, PayTables } from "./FeltPrint";
import { playThreeCardPokerSound, unlockThreeCardPokerAudio } from "./audio";
import {
  getThreeCardPokerAnim,
  preloadThreeCardPokerCriticalAssets,
  type TcpAnimProfile,
  type TcpBetSpot,
} from "./animationConfig";
import { getThreeCardPokerConfig, setThreeCardPokerConfig } from "./runtimeConfig";
import type { PlayingCard } from "./deckEngine";
import type { HandRank } from "./handEvaluator";
import type { MainOutcome } from "./resolver";
import type { PublicDealScript, PublicSettleScript } from "./types";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type FaceKeys = "p0" | "p1" | "p2" | "d0" | "d1" | "d2";

type Phase = "betting" | "dealing" | "decision" | "revealing" | "settled";

type SpotResult = {
  ante: number;
  play: number;
  pairPlus: number;
  anteBonus: number;
};

function CardFan({
  side,
  cards,
  faceDown,
  keys,
  win,
  dealt,
}: {
  side: "player" | "dealer";
  cards: (PlayingCard | null)[];
  faceDown: Record<FaceKeys, boolean>;
  keys: FaceKeys[];
  win: boolean;
  /** Cards are on the table (face-down backs show even before they are known). */
  dealt: boolean;
}) {
  const tilt = side === "dealer" ? [-7, 0, 7] : [-9, 0, 9];

  return (
    <div className="flex items-end justify-center gap-1.5 short-h:gap-[3px] sm:gap-2">
      {keys.map((key, i) => {
        const card = cards[i];
        return (
          <CardCell
            key={key}
            card={card}
            faceDown={faceDown[key]}
            size="lg"
            side={side}
            highlight={win}
            tiltDeg={tilt[i] ?? 0}
            dealt={dealt || Boolean(card)}
            className={
              side === "player"
                ? "short-h:w-[clamp(2.4rem,10vw,3.2rem)]"
                : "short-h:w-[clamp(2.2rem,9vw,3rem)]"
            }
          />
        );
      })}
    </div>
  );
}

/** Settlement badge for a felt spot, expressed as net profit. */
function spotBadge(credit: number, stake: number, settled: boolean) {
  if (!settled || stake <= 0) return {};
  if (credit <= 0) return { lost: true };
  const profit = +(credit - stake).toFixed(2);
  if (profit <= 0.004) return { pushed: true };
  return { win: profit };
}

function outcomeBanner(outcome: MainOutcome | null, credit: number): string {
  switch (outcome) {
    case "player":
      return credit > 0 ? "YOU WIN" : "YOU WIN";
    case "dealer":
      return "DEALER WINS";
    case "tie":
      return "PUSH";
    case "dealer-not-qualify":
      return "DEALER NO QUALIFY";
    case "fold":
      return "FOLDED";
    default:
      return "Ante · Pair Plus · DEAL";
  }
}

/**
 * Three Card Poker — Ante/Play + Pair Plus with a mid-round Play/Fold decision.
 */
export function ThreeCardPokerTable({
  gameId = THREE_CARD_POKER_GAME_ID,
  gameName = "Three Card Poker",
  onBalance,
}: Props) {
  void gameId;
  const animRef = useRef<TcpAnimProfile>(getThreeCardPokerAnim());
  const [cfg, setCfg] = useState<ThreeCardPokerConfig>(() => getThreeCardPokerConfig());
  const [ante, setAnte] = useState(DEFAULT_THREE_CARD_POKER_CONFIG.minAnteBet);
  const [pairPlus, setPairPlus] = useState(0);
  const [activeSpot, setActiveSpot] = useState<TcpBetSpot>("ante");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("betting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lockedAnte, setLockedAnte] = useState(0);
  const [lockedPairPlus, setLockedPairPlus] = useState(0);

  const [playerCards, setPlayerCards] = useState<(PlayingCard | null)[]>([null, null, null]);
  const [dealerCards, setDealerCards] = useState<(PlayingCard | null)[]>([null, null, null]);
  const [faceDown, setFaceDown] = useState<Record<FaceKeys, boolean>>({
    p0: true,
    p1: true,
    p2: true,
    d0: true,
    d1: true,
    d2: true,
  });
  const [playerHand, setPlayerHand] = useState<HandRank | null>(null);
  const [dealerHand, setDealerHand] = useState<HandRank | null>(null);
  const [outcome, setOutcome] = useState<MainOutcome | null>(null);
  const [dealerQualified, setDealerQualified] = useState<boolean | null>(null);
  const [banner, setBanner] = useState("Ante required · Pair Plus optional");
  const [spotResults, setSpotResults] = useState<SpotResult>({
    ante: 0,
    play: 0,
    pairPlus: 0,
    anteBonus: 0,
  });
  const [lastCredit, setLastCredit] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [anteBonusPending, setAnteBonusPending] = useState(false);
  const [decision, setDecision] = useState<"play" | "fold" | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(5);
  const [betHistory, setBetHistory] = useState<ChipPlaceEvent[]>([]);

  const syncBalance = useCallback(
    (n: number) => {
      setBalance(n);
      onBalance?.(n);
    },
    [onBalance],
  );

  useEffect(() => {
    animRef.current = getThreeCardPokerAnim();
    preloadThreeCardPokerCriticalAssets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getThreeCardPokerEngineConfigFn();
        if (cancelled) return;
        setThreeCardPokerConfig(remote);
        setCfg(remote);
        setAnte(remote.minAnteBet);
        setSelectedChip(remote.betSteps.find((v) => v >= 5) ?? remote.betSteps[0] ?? 5);
      } catch {
        setCfg(DEFAULT_THREE_CARD_POKER_CONFIG);
      }

      try {
        const open = await getThreeCardPokerSessionFn();
        if (cancelled || !open) return;
        setSessionId(open.sessionId);
        setLockedAnte(open.ante);
        setLockedPairPlus(open.pairPlus);
        setPlayerCards(open.playerCards);
        setDealerCards([null, null, null]);
        setPlayerHand(open.playerHand);
        setFaceDown({
          p0: false,
          p1: false,
          p2: false,
          d0: true,
          d1: true,
          d2: true,
        });
        setSpotResults({
          ante: 0,
          play: 0,
          pairPlus: open.pairPlusWin,
          anteBonus: 0,
        });
        setAnteBonusPending(open.anteBonusEligible);
        setPhase("decision");
        setBanner("Play (match Ante) or Fold");
      } catch {
        /* no open session */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function placeChip(spot: TcpBetSpot, value: number) {
    if (busy || phase !== "betting") return;
    const max = spot === "ante" ? cfg.maxAnteBet : cfg.maxPairPlusBet;
    const current = spot === "ante" ? ante : pairPlus;
    const next = +Math.min(max, current + value).toFixed(2);
    if (next === current) {
      toast.error(`${spot === "ante" ? "Ante" : "Pair Plus"} max ₱${max}`);
      return;
    }
    if (spot === "ante") setAnte(next);
    else setPairPlus(next);
    setBetHistory((h) => [...h, { spot, value: next - current }]);
    unlockThreeCardPokerAudio();
    playThreeCardPokerSound("chip");
  }

  function undoChip() {
    if (busy || phase !== "betting") return;
    const last = betHistory[betHistory.length - 1];
    if (!last) return;
    if (last.spot === "ante") setAnte((n) => Math.max(0, +(n - last.value).toFixed(2)));
    else setPairPlus((n) => Math.max(0, +(n - last.value).toFixed(2)));
    setBetHistory((h) => h.slice(0, -1));
  }

  function clearAll() {
    if (busy || phase !== "betting") return;
    setAnte(0);
    setPairPlus(0);
    setBetHistory([]);
  }

  function resetToBetting() {
    setPhase("betting");
    setSessionId(null);
    setOutcome(null);
    setDealerQualified(null);
    setPlayerHand(null);
    setDealerHand(null);
    setPlayerCards([null, null, null]);
    setDealerCards([null, null, null]);
    setFaceDown({
      p0: true,
      p1: true,
      p2: true,
      d0: true,
      d1: true,
      d2: true,
    });
    setSpotResults({ ante: 0, play: 0, pairPlus: 0, anteBonus: 0 });
    setLastCredit(0);
    setAnteBonusPending(false);
    setLockedAnte(0);
    setLockedPairPlus(0);
    setBanner("Ante required · Pair Plus optional");
    setAnte(cfg.minAnteBet);
    setPairPlus(0);
    setBetHistory([]);
    setDecision(null);
  }

  async function flipSlot(slot: FaceKeys) {
    const anim = animRef.current;
    setFaceDown((prev) => ({ ...prev, [slot]: false }));
    playThreeCardPokerSound("flip");
    await sleep(anim.flipDuration);
  }

  async function playDealReveal(script: PublicDealScript) {
    const anim = animRef.current;
    setPhase("dealing");
    setOutcome(null);
    setDealerQualified(null);
    setDealerHand(null);
    setPlayerCards(script.playerCards);
    setDealerCards([null, null, null]);
    setPlayerHand(null);
    setLastCredit(0);
    setFaceDown({
      p0: true,
      p1: true,
      p2: true,
      d0: true,
      d1: true,
      d2: true,
    });
    setBanner("Dealing…");
    playThreeCardPokerSound("deal");
    await sleep(anim.dealStagger);

    // Player cards face-up first (player decision), dealer stays down
    await flipSlot("p0");
    await sleep(anim.cardStagger);
    await flipSlot("p1");
    await sleep(anim.cardStagger);
    await flipSlot("p2");

    setPlayerHand(script.playerHand);
    setSpotResults({
      ante: 0,
      play: 0,
      pairPlus: script.pairPlusWin,
      anteBonus: 0,
    });
    setAnteBonusPending(script.anteBonusPending);
    if (script.pairPlusWin > 0) {
      setLastCredit(script.pairPlusWin);
      playThreeCardPokerSound("win");
    }
    await sleep(anim.decisionHold);
    setPhase("decision");
    setBanner("Play (match Ante) or Fold");
  }

  async function playSettleReveal(script: PublicSettleScript) {
    const anim = animRef.current;
    setPhase("revealing");
    setDecision(script.decision);
    setDealerCards(script.dealerCards);
    setDealerHand(null);
    setBanner(script.decision === "fold" ? "Folding…" : "Revealing dealer…");
    await sleep(anim.dealerRevealPause);

    await flipSlot("d0");
    await sleep(anim.cardStagger);
    await flipSlot("d1");
    await sleep(anim.cardStagger);
    await flipSlot("d2");

    setPlayerHand(script.playerHand);
    setDealerHand(script.dealerHand);
    setDealerQualified(script.dealerQualified);
    setOutcome(script.outcome);
    setSpotResults({
      ante: script.anteWin,
      play: script.playWin,
      pairPlus: script.pairPlusWin,
      anteBonus: script.anteBonusWin,
    });
    const credit =
      script.decision === "play"
        ? script.immediateCredit
        : script.pairPlusWin;
    setLastCredit(credit);

    if (script.outcome === "dealer-not-qualify") {
      playThreeCardPokerSound("qualifyFail");
    } else if (script.outcome === "fold") {
      playThreeCardPokerSound("fold");
    } else if (script.outcome === "tie") {
      playThreeCardPokerSound("tie");
    } else if (script.immediateCredit > 0 || script.pairPlusWin > 0) {
      playThreeCardPokerSound(
        script.immediateCredit >= script.ante * 4 ? "bigWin" : "win",
      );
    }

    setBanner(outcomeBanner(script.outcome, credit));
    await sleep(anim.resultHold);
    setPhase("settled");
  }

  async function onDeal() {
    if (busy || phase === "decision") return;
    if (ante <= 0) {
      toast.error("Ante bet is required");
      return;
    }
    if (ante < cfg.minAnteBet) {
      toast.error(`Ante min ₱${cfg.minAnteBet}`);
      return;
    }
    if (pairPlus > 0 && pairPlus < cfg.minPairPlusBet) {
      toast.error(`Pair Plus min ₱${cfg.minPairPlusBet}`);
      return;
    }
    unlockThreeCardPokerAudio();
    setBusy(true);
    try {
      const res = await threeCardPokerDealFn({
        data: { ante, pairPlus },
      });
      syncBalance(res.balance);
      setSessionId(res.sessionId);
      setLockedAnte(res.script.ante);
      setLockedPairPlus(res.script.pairPlus);
      await playDealReveal(res.script);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deal failed");
      resetToBetting();
    } finally {
      setBusy(false);
    }
  }

  async function onPlay() {
    if (busy || !sessionId || phase !== "decision") return;
    unlockThreeCardPokerAudio();
    playThreeCardPokerSound("play");
    setBusy(true);
    try {
      const res = await threeCardPokerPlayFn({ data: { sessionId } });
      syncBalance(res.balance);
      await playSettleReveal(res.script);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Play failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFold() {
    if (busy || !sessionId || phase !== "decision") return;
    unlockThreeCardPokerAudio();
    setBusy(true);
    try {
      const res = await threeCardPokerFoldFn({ data: { sessionId } });
      syncBalance(res.balance);
      await playSettleReveal(res.script);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fold failed");
    } finally {
      setBusy(false);
    }
  }

  const pWin = outcome === "player" || outcome === "dealer-not-qualify";
  const dWin = outcome === "dealer";
  const inDecision = phase === "decision";
  const showResults = phase === "settled" || phase === "revealing";
  const betting = phase === "betting";

  const anteOnFelt = betting ? ante : lockedAnte;
  const pairPlusOnFelt = betting ? pairPlus : lockedPairPlus;
  const playOnFelt = decision === "play" ? lockedAnte : 0;

  const anteBadge = spotBadge(spotResults.ante, anteOnFelt, showResults);
  const playBadge = spotBadge(spotResults.play, playOnFelt, showResults && decision === "play");
  const pairPlusBadge = spotBadge(
    spotResults.pairPlus,
    pairPlusOnFelt,
    inDecision || showResults,
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none touch-manipulation text-[#f7f3e8] select-none">
      {/* pit room — dark casino floor, single warm spotlight over the table */}
      <div className="pointer-events-none absolute inset-0 bg-[#040503]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 34%, #0d2019 0%, #060d0a 55%, #030402 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 46% 26% at 50% -8%, rgba(255,236,188,0.24), rgba(255,230,175,0.06) 45%, transparent 72%)",
          }}
        />
        {/* faint ambient carpet glow at the base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 30% at 50% 108%, rgba(90,48,22,0.28), transparent 60%)",
          }}
        />
      </div>

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2.5 px-3 pt-[max(0.45rem,env(safe-area-inset-top))] pr-14 short-h:pt-1 sm:pr-4 sm:pt-2">
        <div className="min-w-0">
          <div
            className="truncate text-[1.1rem] font-black tracking-[0.1em] text-[#e8c96a] uppercase short-h:text-[0.85rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-[#e8c96a]/50 uppercase short-h:text-[8px]">
            Ante / Play · Pair Plus
          </div>
        </div>
        {balance != null && (
          <div
            className="rounded-2xl border border-[#c9a227]/45 px-3.5 py-1.5 text-base font-bold tabular-nums text-[#f5e6c8] short-h:rounded-md short-h:px-3 short-h:py-1 short-h:text-[13px]"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35))",
              boxShadow: "inset 0 1px 0 rgba(255,224,160,0.18)",
            }}
          >
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      {/* Table */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[27rem] flex-1 flex-col px-2 py-1 short-h:py-0.5 sm:max-w-[31rem] sm:px-3 bc-rail:max-w-[34rem]">
        {/* Pit placards — outside the felt so only cards live on the table */}
        <PayTables cfg={cfg} className="shrink-0 px-0.5 pb-1.5 short-h:hidden" />

        <div
          className="relative flex min-h-0 flex-1 flex-col rounded-[2.4rem] p-[13px] shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
          style={{
            background:
              "linear-gradient(160deg,#7a4423 0%,#3a1c0b 26%,#5a3016 52%,#2a1308 78%,#140702 100%)",
          }}
        >
          {/* polished wood grain */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[2.4rem] opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(74deg, rgba(255,210,150,0.35) 0 1px, transparent 1px 6px), repeating-linear-gradient(74deg, rgba(0,0,0,0.4) 0 1px, transparent 1px 11px)",
            }}
          />
          {/* rail sheen + inner shade */}
          <div className="pointer-events-none absolute inset-0 rounded-[2.4rem] shadow-[inset_0_2px_0_rgba(255,226,176,0.45),inset_0_-4px_10px_rgba(0,0,0,0.7)]" />
          {/* gold inlay pinstripe between rail and felt */}
          <div
            className="pointer-events-none absolute inset-[9px] rounded-[2rem]"
            style={{
              boxShadow:
                "0 0 0 1px rgba(232,201,106,0.55), 0 1px 2px rgba(0,0,0,0.6), inset 0 0 6px rgba(232,201,106,0.25)",
            }}
          />

          <FeltSurface className="relative flex min-h-0 flex-1 flex-col rounded-[1.75rem] shadow-[inset_0_10px_26px_rgba(0,0,0,0.6)]">
            {/* gold border print */}
            <div className="pointer-events-none absolute inset-2 rounded-[1.4rem] border border-[#e8c96a]/25" />
            <div className="pointer-events-none absolute inset-[11px] rounded-[1.25rem] border border-[#e8c96a]/10" />

            {/* Dealer */}
            <div className="relative z-[2] flex shrink-0 flex-col items-center gap-1.5 pt-3 short-h:gap-0.5 short-h:pt-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="text-[12px] font-black tracking-[0.28em] text-[#f4b8c7] uppercase short-h:text-[9px]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Dealer
                </span>
                {showResults && dealerQualified === false ? (
                  <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black tracking-wide text-white short-h:px-1.5 short-h:py-[1px] short-h:text-[8px]">
                    NO QUALIFY
                  </span>
                ) : showResults && dealerQualified === true ? (
                  <span className="rounded-md bg-emerald-400 px-2 py-0.5 text-[10px] font-black tracking-wide text-emerald-950 short-h:px-1.5 short-h:py-[1px] short-h:text-[8px]">
                    QUALIFIED
                  </span>
                ) : null}
              </div>
              <CardFan
                side="dealer"
                cards={dealerCards}
                faceDown={faceDown}
                keys={["d0", "d1", "d2"]}
                win={dWin}
                dealt={!betting}
              />
              <div className="min-h-4 text-xs font-semibold short-h:min-h-3 short-h:text-[10px]">
                {dealerHand && showResults ? (
                  <span className="text-[#f4b8c7]">{dealerHand.label}</span>
                ) : (
                  <span className="text-white/30">hidden until play / fold</span>
                )}
              </div>
            </div>

            {/* Printed house rule */}
            <div className="relative z-[1] -mt-0.5 shrink-0 px-5 short-h:hidden">
              <ArcRule qualifyRank={cfg.dealerQualifyRank} className="h-[30px]" />
            </div>

            {/* Center: printed pay tables + status plaque */}
            <div className="relative z-[2] flex min-h-0 flex-1 flex-col px-2.5">
              <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                {/* screen-printed table wordmark */}
                <span
                  className="pointer-events-none absolute inset-0 grid place-items-center text-center text-[1.15rem] leading-tight font-black tracking-[0.3em] text-[#e8c96a] uppercase opacity-[0.07]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  aria-hidden="true"
                >
                  Three
                  <br />
                  Card Poker
                </span>

                <div
                  className={cn(
                    "relative rounded-xl px-4 py-2 text-center text-base font-black tracking-[0.12em] uppercase short-h:rounded-sm short-h:px-3 short-h:py-1 short-h:text-[11px]",
                    outcome === "fold"
                      ? "bg-slate-600 text-white"
                      : outcome === "tie" || outcome === "dealer-not-qualify"
                        ? "bg-amber-400 text-amber-950"
                        : pWin
                          ? "bg-emerald-400 text-emerald-950"
                          : dWin
                            ? "bg-rose-600 text-white"
                            : "bg-black/50 text-[#e8c96a]",
                  )}
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.45)",
                  }}
                  role="status"
                  aria-live="polite"
                >
                  {banner}
                </div>

                {lastCredit > 0 && !busy ? (
                  <div className="relative text-lg font-black text-emerald-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] short-h:text-sm">
                    +₱{lastCredit.toFixed(2)}
                  </div>
                ) : null}

                {anteBonusPending && inDecision && cfg.anteBonusEnabled ? (
                  <div className="relative text-[11px] font-semibold tracking-wide text-emerald-300/90 short-h:text-[9px]">
                    Ante Bonus pending on Play
                  </div>
                ) : null}
              </div>
            </div>

            {/* Player cards + betting positions */}
            <div className="relative z-[2] flex shrink-0 flex-col items-center gap-1.5 pb-3 short-h:gap-0.5 short-h:pb-1.5">
              <CardFan
                side="player"
                cards={playerCards}
                faceDown={faceDown}
                keys={["p0", "p1", "p2"]}
                win={pWin}
                dealt={!betting}
              />
              <div className="min-h-4 text-xs font-bold short-h:min-h-3 short-h:text-[10px]">
                {playerHand ? (
                  <span className="text-[#f6e7bd]">{playerHand.label}</span>
                ) : (
                  <span className="text-white/30">your hand</span>
                )}
              </div>

              <div className="flex items-end justify-center gap-2.5 pt-1 sm:gap-3.5 short-h:gap-2 short-h:pt-0.5">
                <BetSpot
                  label="Pair+"
                  sublabel={betting ? `${cfg.pairPlus.pair}-${cfg.pairPlus.straightFlush}:1` : undefined}
                  amount={pairPlusOnFelt}
                  tone="pairplus"
                  armed={betting && activeSpot === "pairPlus"}
                  disabled={!betting || busy}
                  onClick={() => {
                    setActiveSpot("pairPlus");
                    placeChip("pairPlus", selectedChip);
                  }}
                  {...pairPlusBadge}
                />
                <BetSpot
                  label="Ante"
                  sublabel={
                    spotResults.anteBonus > 0
                      ? `bonus +₱${spotResults.anteBonus.toFixed(0)}`
                      : betting
                        ? `min ₱${cfg.minAnteBet}`
                        : undefined
                  }
                  amount={anteOnFelt}
                  tone="ante"
                  armed={betting && activeSpot === "ante"}
                  disabled={!betting || busy}
                  onClick={() => {
                    setActiveSpot("ante");
                    placeChip("ante", selectedChip);
                  }}
                  {...anteBadge}
                />
                <BetSpot
                  label="Play"
                  sublabel={inDecision ? "match ante" : undefined}
                  amount={playOnFelt}
                  shape="box"
                  tone="play"
                  armed={inDecision}
                  active={inDecision}
                  disabled
                  {...playBadge}
                />
              </div>
            </div>
          </FeltSurface>
        </div>
      </div>

      {/* Rail dock */}
      <div
        className="relative z-20 shrink-0 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2.5 short-h:px-2 short-h:pt-1.5"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.85))",
          borderTop: "1px solid rgba(201,162,39,0.18)",
        }}
      >
        <div className="mx-auto w-full max-w-[27rem] sm:max-w-[31rem] bc-rail:max-w-[34rem]">
          {inDecision ? (
            <div className="space-y-2 short-h:space-y-1.5">
              <div className="flex items-center justify-between px-0.5 text-[12px] short-h:text-[10px]">
                <span className="font-semibold text-white/55">
                  Ante ₱{lockedAnte.toFixed(0)}
                  {lockedPairPlus > 0 ? ` · Pair+ ₱${lockedPairPlus.toFixed(0)}` : ""}
                </span>
                <span className="text-[#e8c96a]/80">Play matches Ante</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 short-h:gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onFold()}
                  className="min-h-14 rounded-2xl border border-white/25 bg-[linear-gradient(180deg,#3b4453,#1b2129)] text-base font-black tracking-[0.18em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition active:scale-[0.99] disabled:opacity-40 short-h:min-h-12 short-h:rounded-xl short-h:text-sm"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  FOLD
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onPlay()}
                  className="min-h-14 rounded-2xl border border-[#f5e6c8]/70 text-base font-black tracking-[0.14em] text-[#20160a] transition active:scale-[0.99] disabled:opacity-40 short-h:min-h-12 short-h:rounded-xl short-h:text-sm"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    background: "linear-gradient(180deg,#f8e7b0 0%,#e8c96a 45%,#b7912f 100%)",
                    boxShadow:
                      "0 6px 22px rgba(201,162,39,0.4), inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  PLAY ₱{lockedAnte.toFixed(0)}
                </button>
              </div>
            </div>
          ) : phase === "settled" ? (
            <button
              type="button"
              disabled={busy}
              onClick={resetToBetting}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-[#f5e6c8]/70 text-base font-black tracking-[0.22em] text-[#20160a] transition active:scale-[0.99] short-h:min-h-12 short-h:rounded-xl short-h:text-sm"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                background: "linear-gradient(180deg,#f8e7b0 0%,#e8c96a 45%,#b7912f 100%)",
                boxShadow: "0 6px 22px rgba(201,162,39,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              NEW HAND
            </button>
          ) : (
            <BettingPanel
              cfg={cfg}
              ante={ante}
              pairPlus={pairPlus}
              disabled={busy || phase !== "betting"}
              selectedChip={selectedChip}
              onSelectChip={setSelectedChip}
              onPlaceChip={(v) => placeChip(activeSpot, v)}
              activeSpot={activeSpot}
              canUndo={betHistory.length > 0}
              onUndo={undoChip}
              onClearAll={clearAll}
              onDeal={() => void onDeal()}
              dealBusy={busy}
            />
          )}
        </div>
      </div>
    </div>
  );
}
