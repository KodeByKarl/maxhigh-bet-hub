import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  dropDeluxeDealFn,
  dropDeluxeDrawFn,
  getDropDeluxeEngineConfigFn,
  getDropDeluxeOpenHandFn,
} from "@/functions/drop-deluxe";
import {
  DEFAULT_DROP_DELUXE_CONFIG,
  HAND_KEYS,
  HAND_LABEL,
  type DropDeluxeConfig,
  type HandResult,
  type PublicCard,
} from "@/lib/drop-deluxe-config";
import { cn } from "@/lib/utils";
import { playDropDeluxeSound, unlockDropDeluxeAudio } from "./audio";

type Props = {
  gameId?: string;
  gameName?: string;
  onBalance?: (n: number) => void;
};

type Phase = "bet" | "hold" | "done";

const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" } as const;
const FAN = [-9, -4.5, 0, 4.5, 9];
const FAN_Y = [10, 3, 0, 3, 10];

function rankLabel(r: number) {
  return r === 14 ? "A" : r === 13 ? "K" : r === 12 ? "Q" : r === 11 ? "J" : String(r);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const CSS = `
@keyframes dd-deal{0%{transform:translate(0,-160px) rotate(-30deg) scale(.6);opacity:0}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1}}
@keyframes dd-flip{0%{transform:perspective(600px) rotateY(90deg)}100%{transform:perspective(600px) rotateY(0)}}
@keyframes dd-pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.6)}50%{box-shadow:0 0 0 10px rgba(251,191,36,0)}}
@keyframes dd-pop{0%{transform:scale(.3) rotate(-8deg);opacity:0}60%{transform:scale(1.15) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes dd-shine{0%{background-position:-200% 0}100%{background-position:200% 0}}
`;

function PlayingCard({
  card,
  held,
  back,
  disabled,
  index,
  dealKey,
  flipKey,
  onClick,
}: {
  card?: PublicCard;
  held: boolean;
  back: boolean;
  disabled: boolean;
  index: number;
  dealKey: number;
  flipKey: number;
  onClick: () => void;
}) {
  const red = card && (card.suit === "H" || card.suit === "D");
  return (
    <div
      className="relative flex-1"
      style={{
        transform: `rotate(${held ? 0 : FAN[index]}deg) translateY(${held ? -18 : FAN_Y[index]}px)`,
        transition: "transform .25s cubic-bezier(.3,1.4,.5,1)",
      }}
    >
      {held && (
        <span
          className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-950 uppercase shadow-lg"
          style={{ animation: "dd-pop .3s ease-out" }}
        >
          Held
        </span>
      )}
      <button
        key={`${dealKey}-${flipKey}-${index}`}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "relative block aspect-[5/7] w-full rounded-xl border-2 shadow-[0_10px_24px_rgba(0,0,0,.55)]",
          back || !card
            ? "border-amber-200/60 bg-[repeating-linear-gradient(45deg,#7f1d1d_0_6px,#b91c1c_6px_12px)]"
            : "border-white/50 bg-gradient-to-br from-white to-stone-200",
          held && "border-amber-300 shadow-[0_0_26px_rgba(251,191,36,.85)]",
        )}
        style={{
          animation: flipKey
            ? `dd-flip .35s ease-out ${index * 0.07}s both`
            : `dd-deal .45s cubic-bezier(.2,.9,.3,1) ${index * 0.09}s both`,
        }}
      >
        {card && !back && (
          <span
            className={cn(
              "absolute inset-0 flex flex-col justify-between p-1 font-black leading-none",
              red ? "text-rose-600" : "text-slate-900",
            )}
          >
            <span className="text-lg sm:text-2xl">
              {rankLabel(card.rank)}
              <br />
              {SUIT_GLYPH[card.suit]}
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-90 sm:text-5xl">
              {SUIT_GLYPH[card.suit]}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Deluxe Draw — 5-card draw video poker (Jacks or Better). Hold, draw once.
 */
export function DropDeluxeTable({ gameName = "Deluxe Draw", onBalance }: Props) {
  const [cfg, setCfg] = useState<DropDeluxeConfig>(DEFAULT_DROP_DELUXE_CONFIG);
  const [phase, setPhase] = useState<Phase>("bet");
  const [hand, setHand] = useState<PublicCard[]>([]);
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false]);
  const [hidden, setHidden] = useState<boolean[]>([false, false, false, false, false]);
  const [bet, setBet] = useState(5);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [banner, setBanner] = useState("Choose your stake and deal");
  const [result, setResult] = useState<HandResult | null>(null);
  const [payout, setPayout] = useState(0);
  const [dealKey, setDealKey] = useState(0);
  const [flipKey, setFlipKey] = useState(0);

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
        const [remote, open] = await Promise.all([
          getDropDeluxeEngineConfigFn(),
          getDropDeluxeOpenHandFn(),
        ]);
        if (cancelled) return;
        setCfg(remote);
        setBet((b) => Math.min(Math.max(b, remote.minBet), remote.maxBet));
        if (open.open) {
          setBet(open.open.bet);
          setHand(open.open.hand);
          setPhase("hold");
          setDealKey((k) => k + 1);
          setBanner("Hand resumed — tap cards to hold");
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDeal() {
    unlockDropDeluxeAudio();
    setBusy(true);
    try {
      const res = await dropDeluxeDealFn({ data: { bet } });
      syncBalance(res.balance);
      playDropDeluxeSound("deal", 0.45);
      setResult(null);
      setPayout(0);
      setHolds([false, false, false, false, false]);
      setHand(res.open.hand);
      setFlipKey(0);
      setDealKey((k) => k + 1);
      setPhase("hold");
      setBanner("Tap the cards worth keeping");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deal failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDraw() {
    unlockDropDeluxeAudio();
    setBusy(true);
    try {
      const res = await dropDeluxeDrawFn({ data: { holds } });
      syncBalance(res.balance);
      setHidden(res.replaced);
      playDropDeluxeSound("deal", 0.4);
      await sleep(300);
      setHand(res.hand);
      setHidden([false, false, false, false, false]);
      setFlipKey((k) => k + 1);
      await sleep(550);
      setResult(res.result);
      setPayout(res.payout);
      setPhase("done");
      if (res.payout > 0) {
        playDropDeluxeSound("win");
        setBanner(`+₱${res.payout.toFixed(2)}`);
      } else {
        playDropDeluxeSound("lose", 0.4);
        setBanner("No winning hand — try again");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draw failed");
    } finally {
      setBusy(false);
    }
  }

  function toggle(i: number) {
    if (phase !== "hold" || busy) return;
    playDropDeluxeSound("chip", 0.3);
    setHolds((h) => h.map((v, j) => (j === i ? !v : v)));
  }

  function newHand() {
    setPhase("bet");
    setHand([]);
    setResult(null);
    setPayout(0);
    setFlipKey(0);
    setDealKey((k) => k + 1);
    setBanner("Choose your stake and deal");
  }

  const heldCount = holds.filter(Boolean).length;
  const canEditBet = phase !== "hold" && !busy;

  function stepBet(dir: 1 | -1) {
    if (!canEditBet) return;
    const steps = cfg.betSteps;
    const idx = steps.findIndex((v) => v >= bet);
    const cur = idx === -1 ? steps.length - 1 : idx;
    const next = Math.min(steps.length - 1, Math.max(0, cur + dir));
    setBet(steps[next]);
    playDropDeluxeSound("chip", 0.3);
  }
  const won = payout > 0 && result && result !== "none";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#06110d] text-white">
      <style>{CSS}</style>
      {/* felt */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 55%, #0f5a3c 0%, #0a3a28 45%, #06110d 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-3 rounded-[2.2rem] border border-amber-300/20"
        style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,.55)" }}
      />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 pt-[max(0.6rem,env(safe-area-inset-top))] pr-14 sm:pr-5">
        <div className="min-w-0">
          <div className="truncate bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-[1.2rem] font-black tracking-[0.16em] text-transparent uppercase">
            {gameName}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-emerald-100/50 uppercase">
            Jacks or Better · one draw
          </div>
        </div>
        {balance != null && (
          <div className="rounded-full border border-amber-300/40 bg-black/55 px-3.5 py-1.5 text-base font-bold tabular-nums">
            ₱{balance.toFixed(2)}
          </div>
        )}
      </header>

      {/* paytable marquee */}
      <div className="relative z-10 mt-2 flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1">
        {HAND_KEYS.map((k) => {
          const hit = result === k;
          return (
            <div
              key={k}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border px-2.5 py-1 text-center transition-all",
                hit
                  ? "scale-110 border-amber-300 bg-amber-300 text-amber-950"
                  : "border-white/10 bg-black/35 text-white/70",
              )}
              style={hit ? { animation: "dd-pulse 1s infinite" } : undefined}
            >
              <span className="text-[9px] font-bold tracking-wide whitespace-nowrap uppercase">
                {HAND_LABEL[k]}
              </span>
              <span className="text-sm font-black tabular-nums">{cfg.paytable[k]}×</span>
            </div>
          );
        })}
      </div>

      {/* table */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center px-4">
        <div className="h-16 w-full text-center">
          {won ? (
            <div style={{ animation: "dd-pop .5s ease-out" }}>
              <div
                className="bg-clip-text text-2xl font-black tracking-wider text-transparent uppercase"
                style={{
                  backgroundImage: "linear-gradient(90deg,#fde68a,#fff,#fbbf24,#fff,#fde68a)",
                  backgroundSize: "200% 100%",
                  animation: "dd-shine 2.2s linear infinite",
                }}
              >
                {HAND_LABEL[result as Exclude<HandResult, "none">]}
              </div>
              <div className="text-xl font-black text-emerald-300 tabular-nums">{banner}</div>
            </div>
          ) : (
            <div className="pt-4 text-sm font-bold text-emerald-50/80">{banner}</div>
          )}
        </div>

        <div className="mt-6 flex w-full items-end gap-1 pt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <PlayingCard
              key={i}
              index={i}
              card={hand[i]}
              back={phase === "bet" || hidden[i]}
              held={phase === "hold" && holds[i]}
              disabled={phase !== "hold" || busy}
              dealKey={dealKey}
              flipKey={flipKey}
              onClick={() => toggle(i)}
            />
          ))}
        </div>
      </div>

      {/* rail */}
      <div className="relative z-20 shrink-0 px-4 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {phase !== "hold" && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {cfg.betSteps.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBet(v);
                    playDropDeluxeSound("chip", 0.3);
                  }}
                  className={cn(
                    "h-11 w-11 rounded-full border-[3px] border-dashed text-xs font-black tabular-nums shadow-lg transition",
                    bet === v
                      ? "-translate-y-1 scale-110 border-white bg-amber-300 text-amber-950"
                      : "border-white/50 bg-red-800/80 text-white",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-2xl border border-white/10 bg-black/40">
              <button
                type="button"
                aria-label="Lower stake"
                disabled={!canEditBet}
                onClick={() => stepBet(-1)}
                className="h-full rounded-l-2xl px-3 text-2xl font-black text-amber-300 active:bg-white/10 disabled:opacity-30"
              >
                −
              </button>
              <div className="flex min-w-[3.6rem] flex-col px-1 py-1.5 text-center">
                <span className="text-[9px] font-bold tracking-widest text-white/45 uppercase">
                  Stake
                </span>
                <span className="text-lg leading-none font-black tabular-nums text-amber-300">
                  ₱{bet}
                </span>
              </div>
              <button
                type="button"
                aria-label="Raise stake"
                disabled={!canEditBet}
                onClick={() => stepBet(1)}
                className="h-full rounded-r-2xl px-3 text-2xl font-black text-amber-300 active:bg-white/10 disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void (phase === "bet" ? onDeal() : phase === "hold" ? onDraw() : newHand())
              }
              className="flex-1 rounded-full bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 py-3.5 text-base font-black tracking-[0.2em] text-amber-950 uppercase shadow-[0_6px_0_#92400e,0_14px_24px_rgba(0,0,0,.5)] transition active:translate-y-1 active:shadow-[0_2px_0_#92400e] disabled:opacity-50"
              style={phase === "hold" ? { animation: "dd-pulse 1.4s infinite" } : undefined}
            >
              {busy
                ? "…"
                : phase === "bet"
                  ? "Deal"
                  : phase === "hold"
                    ? heldCount > 0
                      ? `Draw · ${heldCount} held`
                      : "Draw all"
                    : "New hand"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
