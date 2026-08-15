"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { RrSymKind } from "@/lib/reel-riot-config";
import { SYM_NAME } from "./animationConfig";
import { getReelRiotConfig } from "./runtimeConfig";
import { FruitRiotIcon } from "./FruitRiotIcon";

type PaytableModalProps = {
  open: boolean;
  onClose: () => void;
};

type TabId = "howto" | "patterns" | "pays" | "rules";

const TABS: { id: TabId; label: string }[] = [
  { id: "howto", label: "How to Win" },
  { id: "patterns", label: "Patterns" },
  { id: "pays", label: "Pays" },
  { id: "rules", label: "Rules" },
];

const PAY_ORDER: RrSymKind[] = [
  "watermelon",
  "plum",
  "grape",
  "pear",
  "banana",
  "apple",
  "cherry",
  "double_wild",
];

const HOWTO_IMG = {
  payline: "/images/fruit-riot/howto/win-payline.webp",
  threeFruit: "/images/fruit-riot/howto/win-three-fruit.webp",
  twoWild: "/images/fruit-riot/howto/win-two-wild.webp",
  bonus: "/images/fruit-riot/howto/win-bonus-ladder.webp",
} as const;

function PatternStrip({ kinds, label }: { kinds: RrSymKind[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/25 bg-black/35 px-2 py-1.5">
        {kinds.map((k, i) => (
          <div key={`${k}-${i}`} className="size-11 shrink-0 sm:size-12">
            <FruitRiotIcon kind={k} framed={false} />
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-yellow-100/85">
        {label}
      </p>
    </div>
  );
}

function SampleCard({
  title,
  criteria,
  img,
  strip,
  payout,
}: {
  title: string;
  criteria: string;
  img: string;
  strip: RrSymKind[];
  payout: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/20 bg-black/30">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
          <h4 className="text-sm font-black text-yellow-100">{title}</h4>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <PatternStrip kinds={strip} label="In-game pattern" />
        <p className="text-[11px] leading-relaxed text-white/75">{criteria}</p>
        <p className="rounded-xl border border-yellow-300/30 bg-yellow-400/10 px-2.5 py-1.5 text-center text-xs font-bold text-yellow-100">
          {payout}
        </p>
      </div>
    </article>
  );
}

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  const [tab, setTab] = useState<TabId>("howto");
  if (!open) return null;

  const cfg = getReelRiotConfig();
  const twoWild = cfg.twoWildPayMult;
  const maxBet = cfg.maxBet;
  const minBet = cfg.minBet;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-white/40 bg-gradient-to-b from-fuchsia-900/95 via-purple-950/95 to-orange-950/95 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-yellow-100">Fruit Riot · How to Win</h2>
            <p className="text-[10px] text-white/60">3 reels · 1 payline · classic fruit machine</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 p-1.5 text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "shrink-0 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 px-3 py-1.5 text-[11px] font-black text-purple-950"
                  : "shrink-0 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {tab === "howto" && (
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wide text-yellow-200">
                  The payline
                </h3>
                <div className="overflow-hidden rounded-2xl border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HOWTO_IMG.payline}
                    alt="Center payline across three reels"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <p className="text-xs leading-relaxed text-white/80">
                  Wins are judged on the <span className="font-bold text-yellow-100">center
                  horizontal line</span> only — the middle symbol on each of the 3 reels. Match the
                  pattern criteria below on that line to win.
                </p>
              </section>

              <section className="space-y-2 rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-yellow-200">
                  Win criteria (summary)
                </h3>
                <ul className="space-y-2 text-xs text-white/80">
                  <li>
                    <span className="font-bold text-pink-200">3 matching fruits</span> on the center
                    line → fruit pay × your stake
                  </li>
                  <li>
                    <span className="font-bold text-fuchsia-200">Exactly 2 Double Wilds</span> on the
                    line → {twoWild}× stake cash
                    {cfg.jackpot.requireMaxBet
                      ? ` · at max bet (₱${maxBet}) also unlocks Progressive Jackpot`
                      : ""}
                  </li>
                  <li>
                    <span className="font-bold text-orange-200">Exactly 3 Double Wilds</span> → Bonus
                    Ladder (no base cash; climb for multipliers)
                  </li>
                  <li>
                    <span className="font-bold text-white/90">2-of-3 fruits</span> do not pay. Wild
                    does not substitute for fruit matches.
                  </li>
                </ul>
              </section>

              <p className="text-center text-[11px] text-white/55">
                Open the <span className="text-yellow-200">Patterns</span> tab for pictured win
                samples.
              </p>
            </div>
          )}

          {tab === "patterns" && (
            <div className="space-y-4">
              <p className="text-xs text-white/70">
                Example winning layouts. Strip icons show the exact in-game symbols.
              </p>

              <SampleCard
                title="Three of a Kind"
                criteria="All three center symbols are the same fruit (Cherries, Apples, Bananas, Grapes, Pears, Plums, or Watermelons)."
                img={HOWTO_IMG.threeFruit}
                strip={["cherry", "cherry", "cherry"]}
                payout="Pays fruit multiplier × stake (see Pays tab)"
              />

              <SampleCard
                title="Two Double Wilds"
                criteria="Exactly two Double Wild symbols on the center line (third reel can be any fruit). Mutually exclusive with 3-Wild."
                img={HOWTO_IMG.twoWild}
                strip={["double_wild", "cherry", "double_wild"]}
                payout={`${twoWild}× stake cash${
                  cfg.jackpot.requireMaxBet
                    ? ` · Progressive JP if stake = ₱${maxBet}`
                    : ""
                }`}
              />

              <SampleCard
                title="Three Double Wilds · Bonus Ladder"
                criteria="All three center symbols are Double Wild. Triggers Bonus Ladder instead of a base cash win."
                img={HOWTO_IMG.bonus}
                strip={["double_wild", "double_wild", "double_wild"]}
                payout="Bonus Ladder — climb lines for stacked multipliers"
              />

              <section className="rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="mb-2 text-sm font-black text-yellow-200">Losing / no-pay examples</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <PatternStrip
                    kinds={["cherry", "cherry", "apple"]}
                    label="Only 2 match — no pay"
                  />
                  <PatternStrip
                    kinds={["cherry", "double_wild", "apple"]}
                    label="1 Wild + mixed fruit — no pay"
                  />
                </div>
              </section>
            </div>
          )}

          {tab === "pays" && (
            <div className="space-y-2">
              <p className="mb-2 text-xs text-white/70">
                All pays are × your total stake (₱{minBet}–₱{maxBet}). Values are provisional /
                config-pending.
              </p>
              {PAY_ORDER.map((kind) => {
                const sym = cfg.symbols.find((s) => s.kind === kind);
                if (!sym) return null;
                return (
                  <div
                    key={kind}
                    className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-2 py-1.5"
                  >
                    <div className="size-12 shrink-0">
                      <FruitRiotIcon kind={kind} framed={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">
                        {SYM_NAME[kind] ?? sym.name}
                      </div>
                      {kind === "double_wild" ? (
                        <div className="text-[11px] text-fuchsia-100/85">
                          2 DW → {twoWild}× · 3 DW → Bonus Ladder
                          {cfg.jackpot.requireMaxBet
                            ? ` · JP at ₱${maxBet} + 2 DW`
                            : ""}
                        </div>
                      ) : (
                        <div className="text-[11px] tabular-nums text-white/70">
                          3-of-a-kind · {sym.payMult}× stake
                          <span className="text-white/45">
                            {" "}
                            (₱{(sym.payMult * minBet).toFixed(0)}–₱
                            {(sym.payMult * maxBet).toFixed(0)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "rules" && (
            <div className="space-y-3 text-xs leading-relaxed text-white/80">
              <section className="rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="mb-1.5 text-sm font-black text-yellow-200">Hold</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Tap a reel to Hold it before the next spin — freezes that center symbol.</li>
                  <li>
                    <span className="font-bold text-pink-200">Double Wild cannot be held</span> —
                    hold is blocked on Wilds.
                  </li>
                  <li>Holds clear after each resolved spin (and while Auto is on).</li>
                  <li>Up to {cfg.holdMaxReels} reels may be held at once.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="mb-1.5 text-sm font-black text-yellow-200">Bonus Ladder</h3>
                <p>
                  Triggered by <span className="font-bold text-orange-200">3× Double Wild</span>. You
                  climb {cfg.bonusLadder.lineCount} ladder lines; each stop can award a multiplier
                  or STOP. Multipliers stack ({cfg.bonusLadder.stackMode}) × your stake when the
                  ladder ends.
                </p>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="mb-1.5 text-sm font-black text-yellow-200">Progressive Jackpot</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Stake must equal max bet (₱{maxBet}).</li>
                  <li>
                    Center line must show exactly {cfg.jackpot.triggerWildCount} Double Wilds
                    (same trigger as the {twoWild}× cash win).
                  </li>
                  <li>A share of each bet contributes to the jackpot pool.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/25 p-3">
                <h3 className="mb-1.5 text-sm font-black text-yellow-200">Controls</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-bold">Bet − / +</span> — adjust stake ·{" "}
                    <span className="font-bold">Max</span> — jump to ₱{maxBet}
                  </li>
                  <li>
                    <span className="font-bold">Auto</span> — continuous spins (holds cleared)
                  </li>
                  <li>
                    <span className="font-bold">Turbo</span> — faster reel timing
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
