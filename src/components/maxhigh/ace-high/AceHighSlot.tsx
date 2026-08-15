import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { aceHighDealFn, getAceHighEngineConfigFn } from "@/functions/api";
import {
  ACE_HIGH_GAME_ID,
  DEFAULT_ACE_HIGH_CONFIG,
  type AceHighConfig,
} from "@/lib/ace-high-config";
import { cn } from "@/lib/utils";
import { BettingPanel, type ChipPlaceEvent } from "./BettingPanel";
import { CardIcon } from "./CardIcon";
import { ChipStack, chipsFromAmount, type SpotChip } from "./ChipStack";
import { playAceHighSound, speakAceHighWinner, unlockAceHighAudio } from "./audio";
import {
  AH_ASSET,
  getAceHighAnim,
  preloadAceHighCriticalAssets,
  type AhAnimProfile,
  type AhBetSpot,
} from "./animationConfig";
import { getAceHighConfig, setAceHighConfig } from "./runtimeConfig";
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

export function AceHighSlot({
  gameId = ACE_HIGH_GAME_ID,
  gameName = "Ace High",
  onBalance,
}: Props) {
  const uid = useId();
  const animRef = useRef<AhAnimProfile>(getAceHighAnim());
  const [cfg, setCfg] = useState<AceHighConfig>(() => getAceHighConfig());
  const [baseBet, setBaseBet] = useState(DEFAULT_ACE_HIGH_CONFIG.minBet);
  const [tieBet, setTieBet] = useState(0);
  const [aceBonusBet, setAceBonusBet] = useState(0);
  const [activeSpot, setActiveSpot] = useState<AhBetSpot>("base");
  const [busy, setBusy] = useState(false);
  const [playerCards, setPlayerCards] = useState<[PlayingCard | null, PlayingCard | null]>([
    null,
    null,
  ]);
  const [dealerCards, setDealerCards] = useState<[PlayingCard | null, PlayingCard | null]>([
    null,
    null,
  ]);
  const [warCards, setWarCards] = useState<{
    player: PlayingCard | null;
    dealer: PlayingCard | null;
  }>({ player: null, dealer: null });
  const [faceDown, setFaceDown] = useState({
    d0: true,
    d1: true,
    p0: true,
    p1: true,
    warD: true,
    warP: true,
  });
  const [banner, setBanner] = useState("Place your bets");
  const [lastCredit, setLastCredit] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [warActive, setWarActive] = useState(false);
  const [warMatched, setWarMatched] = useState(0);
  const [spotChips, setSpotChips] = useState<Record<AhBetSpot, SpotChip[]>>({
    base: [],
    tie: [],
    ace: [],
  });

  const syncBalance = useCallback(
    (n: number) => {
      setBalance(n);
      onBalance?.(n);
    },
    [onBalance],
  );

  useEffect(() => {
    animRef.current = getAceHighAnim();
    preloadAceHighCriticalAssets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getAceHighEngineConfigFn();
        if (cancelled) return;
        setAceHighConfig(remote);
        setCfg(remote);
        setBaseBet(remote.minBet);
        setSpotChips((s) => ({
          ...s,
          base: chipsFromAmount(remote.minBet, `${uid}-base-init`),
        }));
      } catch {
        setCfg(DEFAULT_ACE_HIGH_CONFIG);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  function onChipPlaced(ev: ChipPlaceEvent) {
    unlockAceHighAudio();
    playAceHighSound("chip");
    const id = `${uid}-${ev.spot}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSpotChips((prev) => ({
      ...prev,
      [ev.spot]: [...prev[ev.spot], { id, value: ev.value }].slice(-4),
    }));
  }

  function onClearSpot(spot: AhBetSpot) {
    setSpotChips((prev) => ({
      ...prev,
      [spot]: spot === "base" ? chipsFromAmount(cfg.minBet, `${uid}-base-clear`) : [],
    }));
  }

  function syncStacksFromBets(b: number, t: number, a: number) {
    setSpotChips({
      base: chipsFromAmount(b, `${uid}-base`),
      tie: chipsFromAmount(t, `${uid}-tie`),
      ace: chipsFromAmount(a, `${uid}-ace`),
    });
  }

  async function flipSlot(slot: keyof typeof faceDown) {
    const anim = animRef.current;
    setFaceDown((prev) => ({ ...prev, [slot]: false }));
    playAceHighSound("flip");
    await sleep(anim.flipDuration);
  }

  async function playDealReveal(script: PublicDealScript) {
    const anim = animRef.current;
    setWarCards({ player: null, dealer: null });
    setPlayerCards([script.playerCards[0], script.playerCards[1]]);
    setDealerCards([script.dealerCards[0], script.dealerCards[1]]);
    setFaceDown({
      d0: true,
      d1: true,
      p0: true,
      p1: true,
      warD: true,
      warP: true,
    });
    setBanner("Dealing…");
    playAceHighSound("deal");
    await sleep(anim.dealStagger);

    await flipSlot("d0");
    await sleep(anim.card2Stagger);
    await flipSlot("p0");
    await sleep(anim.card2Stagger);
    await flipSlot("d1");
    await sleep(anim.card2Stagger);
    await flipSlot("p1");
    await sleep(anim.resultHold / 3);

    if (script.initialOutcome === "tie" && script.warSteps.length > 0) {
      setWarActive(true);
      setBanner("TIE — Going to War!");
      playAceHighSound("war");
      speakAceHighWinner("war");
      let matched = 0;
      for (const step of script.warSteps) {
        matched = +(matched + step.matchAmount).toFixed(2);
        setWarMatched(matched);
        setBanner(`War · depth ${step.warDepth}`);
        setWarCards({ player: step.playerCard, dealer: step.dealerCard });
        setFaceDown((prev) => ({ ...prev, warD: true, warP: true }));
        await sleep(anim.warBurnPause);
        await flipSlot("warD");
        await sleep(anim.warCardStagger);
        await flipSlot("warP");
        await sleep(anim.warFlash);
      }
      setWarActive(false);
    }

    const totalShown = script.baseWin + script.tieWin + script.aceBonusWin;
    setLastCredit(totalShown);

    if (script.splitPot) {
      setBanner("Split pot — stakes returned");
      playAceHighSound("tie");
      speakAceHighWinner("split");
    } else if (script.outcome === "player") {
      const big = totalShown >= baseBet * 10;
      setBanner(big ? "BIG WIN!" : "You win!");
      playAceHighSound(big ? "bigWin" : "win");
      speakAceHighWinner(big ? "bigWin" : "win");
    } else if (script.outcome === "dealer") {
      setBanner("Dealer wins");
      playAceHighSound("flip");
      speakAceHighWinner("dealer");
    } else {
      setBanner("Round complete");
    }
  }

  async function onDeal() {
    if (busy) return;
    if (baseBet < cfg.minBet) {
      toast.error(`Minimum base bet ₱${cfg.minBet}`);
      return;
    }
    unlockAceHighAudio();
    setBusy(true);
    setLastCredit(0);
    setWarMatched(0);
    try {
      const res = await aceHighDealFn({
        data: { baseBet, tieBet, aceBonusBet },
      });
      syncBalance(res.balance);
      await playDealReveal(res.script);
      syncStacksFromBets(baseBet, 0, 0);
      setTieBet(0);
      setAceBonusBet(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deal failed");
      setBanner("Place your bets");
      setFaceDown({
        d0: true,
        d1: true,
        p0: true,
        p1: true,
        warD: true,
        warP: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none touch-manipulation bg-[#050608] text-white select-none">
      <div className="pointer-events-none absolute inset-0">
        <img
          src={`${AH_ASSET.board}?v=6`}
          alt=""
          className="h-full w-full object-cover object-[center_35%] sm:object-center"
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />
        {/* Soft gradient only — avoid heavy backdrop-blur on the whole table */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/55" />
      </div>

      <header className="relative z-10 flex shrink-0 flex-col items-center px-2 pt-[max(0.35rem,env(safe-area-inset-top))] text-center sm:px-3 sm:pt-2">
        <div className="font-serif text-[1.35rem] font-black tracking-[0.06em] text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-xl">
          {gameName}
        </div>
        {balance != null && (
          <div className="mt-1 rounded-full border border-amber-400/45 bg-black/75 px-4 py-1 text-base font-bold tabular-nums text-amber-50 sm:mt-1.5 sm:px-6 sm:py-2 sm:text-lg">
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-evenly px-2 py-1 sm:px-3 sm:py-2">
        <div className="pointer-events-none absolute inset-0 z-20">
          <ChipStack spot="base" chips={spotChips.base} />
          <ChipStack
            spot="tie"
            chips={spotChips.tie}
            warActive={warActive}
            warMatched={warMatched}
          />
          <ChipStack spot="ace" chips={spotChips.ace} />
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-amber-200/90 drop-shadow sm:hidden">
            DEALER
          </span>
          <div className="flex gap-2 sm:gap-2.5">
            <CardIcon
              card={dealerCards[0]}
              faceDown={faceDown.d0}
              size="lg"
              highlight={banner.includes("Dealer")}
            />
            <CardIcon
              card={dealerCards[1]}
              faceDown={faceDown.d1}
              size="lg"
              highlight={banner.includes("Dealer")}
            />
          </div>
          {warCards.dealer ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-extrabold tracking-widest text-rose-200 sm:text-[8px] sm:font-bold sm:text-rose-200/80">
                WAR
              </span>
              <CardIcon card={warCards.dealer} faceDown={faceDown.warD} size="sm" highlight />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "max-w-[94%] rounded-full border-2 border-amber-400/55 bg-black/75 px-4 py-2 text-center text-base font-bold tracking-wide text-amber-50 short-h:px-3 short-h:py-1.5 short-h:text-sm sm:border sm:border-amber-400/45 sm:bg-black/70 sm:px-5 sm:py-1.5 sm:text-sm sm:font-semibold sm:text-amber-100",
            warActive && "animate-pulse border-rose-400/70 text-rose-100",
          )}
        >
          {banner}
          {lastCredit > 0 && !warActive && !busy ? (
            <span className="ml-2 text-lg font-black text-emerald-300 sm:ml-1.5 sm:text-base sm:font-semibold">
              +₱{lastCredit.toFixed(2)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-1">
          {warCards.player ? (
            <div className="flex flex-col items-center gap-0.5">
              <CardIcon card={warCards.player} faceDown={faceDown.warP} size="sm" highlight />
              <span className="text-[11px] font-extrabold tracking-widest text-rose-200 sm:text-[8px] sm:font-bold sm:text-rose-200/80">
                WAR
              </span>
            </div>
          ) : null}
          <div className="flex gap-2 sm:gap-2.5">
            <CardIcon
              card={playerCards[0]}
              faceDown={faceDown.p0}
              size="lg"
              highlight={banner.includes("win") || banner.includes("WIN")}
            />
            <CardIcon
              card={playerCards[1]}
              faceDown={faceDown.p1}
              size="lg"
              highlight={banner.includes("win") || banner.includes("WIN")}
            />
          </div>
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-amber-200/90 drop-shadow sm:hidden">
            PLAYER
          </span>
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-amber-800/25 bg-black/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:bg-black/85 sm:px-3 sm:pb-2 sm:pt-1.5">
        <BettingPanel
          cfg={cfg}
          baseBet={baseBet}
          tieBet={tieBet}
          aceBonusBet={aceBonusBet}
          disabled={busy}
          onBaseBet={setBaseBet}
          onTieBet={setTieBet}
          onAceBonusBet={setAceBonusBet}
          activeSpot={activeSpot}
          onActiveSpot={setActiveSpot}
          onChipPlaced={onChipPlaced}
          onClearSpot={onClearSpot}
          dealSlot={
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDeal()}
              className="h-14 min-w-[5.5rem] rounded-full border border-amber-200/50 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 px-5 text-base font-black tracking-[0.14em] text-amber-950 shadow-md active:scale-95 disabled:opacity-50 short-h:h-12 short-h:min-w-[4.75rem] short-h:text-sm"
            >
              DEAL
            </button>
          }
        />

        <div className="mt-1.5 hidden justify-center sm:flex">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDeal()}
            className="min-w-[8.5rem] rounded-full border border-amber-200/35 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 px-8 py-2 text-xs font-black tracking-[0.28em] text-amber-950 shadow-[0_6px_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
          >
            DEAL
          </button>
        </div>
      </div>
    </div>
  );
}
