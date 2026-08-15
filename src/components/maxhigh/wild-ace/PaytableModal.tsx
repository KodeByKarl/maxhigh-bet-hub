"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SYMBOL_NAMES, type WildAceSymKind } from "@/lib/wild-ace-config";
import { getWildAceConfig } from "./runtimeConfig";
import { WildAceIcon } from "./WildAceIcon";

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

const PAY_ORDER: WildAceSymKind[] = [
  "ace_gold",
  "diamond",
  "club",
  "heart",
  "spade",
  "sym_a",
  "sym_k",
  "sym_q",
  "sym_j",
  "little_joker",
  "big_joker",
  "scatter",
];

const HOWTO_IMG = {
  ways: "/images/wild-ace/howto/win-ways.png",
  threeCards: "/images/wild-ace/howto/win-three-cards.png",
  goldenJoker: "/images/wild-ace/howto/win-golden-joker.png",
  cascade: "/images/wild-ace/howto/win-cascade.png",
  freeSpins: "/images/wild-ace/howto/win-free-spins.png",
} as const;

function PatternStrip({ kinds, label }: { kinds: WildAceSymKind[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-2xl border border-amber-300/30 bg-black/40 px-2 py-1.5">
        {kinds.map((k, i) => (
          <div key={`${k}-${i}`} className="size-11 shrink-0 sm:size-12">
            <WildAceIcon kind={k} />
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-amber-100/85">
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
  strip: WildAceSymKind[];
  payout: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-amber-300/25 bg-black/35">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
        <img src={img} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
          <h4 className="text-sm font-black text-[#F5D76E]">{title}</h4>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <PatternStrip kinds={strip} label="Example pattern" />
        <p className="text-[11px] leading-relaxed text-red-50/80">{criteria}</p>
        <p className="rounded-xl border border-amber-300/35 bg-amber-400/10 px-2.5 py-1.5 text-center text-xs font-bold text-[#F5D76E]">
          {payout}
        </p>
      </div>
    </article>
  );
}

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  const [tab, setTab] = useState<TabId>("howto");
  if (!open) return null;

  const cfg = getWildAceConfig();
  const ways =
    Math.pow(cfg.maxReelHeight, cfg.reelsCount) ||
    cfg.reelsCount * cfg.maxReelHeight;
  const baseMult = cfg.baseCascadeMultipliers.map((m) => `×${m}`).join(" → ");
  const fsMult = cfg.freeSpinsCascadeMultipliers.map((m) => `×${m}`).join(" → ");

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-[#E8C547]/55 shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(127,29,29,0.98) 0%, rgba(69,10,10,0.99) 55%, rgba(28,7,7,1) 100%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Mega Ace How to Win"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-300/20 px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-[#F5D76E]">Mega Ace · How to Win</h2>
            <p className="text-[10px] text-red-100/60">
              {cfg.reelsCount}×{cfg.maxReelHeight} · {ways.toLocaleString()} ways · Lucky Poker
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-300/40 p-1.5 text-[#F5D76E] hover:bg-white/10"
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
                  ? "shrink-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-3 py-1.5 text-[11px] font-black text-red-950"
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
                <h3 className="text-sm font-black uppercase tracking-wide text-[#F5D76E]">
                  Ways to win
                </h3>
                <div className="overflow-hidden rounded-2xl border border-amber-300/25">
                  <img
                    src={HOWTO_IMG.ways}
                    alt="1,024 ways left to right on adjacent reels"
                    loading="lazy"
                    decoding="async"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <p className="text-xs leading-relaxed text-red-50/85">
                  Wins pay on <span className="font-bold text-[#F5D76E]">adjacent reels from the
                  left</span> (reel 1 → reel 5). Land{" "}
                  <span className="font-bold text-[#F5D76E]">3 or more</span> matching cards on
                  consecutive reels — any row position counts. There are{" "}
                  <span className="font-bold text-[#F5D76E]">{ways.toLocaleString()} ways</span>{" "}
                  on the {cfg.reelsCount}×{cfg.maxReelHeight} grid.
                </p>
              </section>

              <section className="space-y-2 rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#F5D76E]">
                  Win criteria
                </h3>
                <ul className="space-y-2 text-xs text-red-50/85">
                  <li>
                    <span className="font-bold text-amber-200">3 / 4 / 5 matching cards</span> on
                    consecutive reels starting from reel 1 → pay × ways × cascade multiplier × bet
                  </li>
                  <li>
                    <span className="font-bold text-sky-200">Little Joker</span> &{" "}
                    <span className="font-bold text-red-300">Big Joker</span> substitute for all
                    paying symbols (not Scatter)
                  </li>
                  <li>
                    <span className="font-bold text-yellow-200">Golden Cards</span> on reels 2–4
                    transform into a Joker when they are part of a win
                  </li>
                  <li>
                    <span className="font-bold text-orange-200">Cascades</span> remove winning
                    symbols; new cards drop in and the combo multiplier climbs
                  </li>
                  <li>
                    <span className="font-bold text-rose-200">
                      {cfg.freeSpinsTriggerCount}+ Scatters
                    </span>{" "}
                    anywhere → {cfg.freeSpinsBaseCount} Free Spins (retrigger +
                    {cfg.freeSpinsRetriggerCount}, uncapped)
                  </li>
                </ul>
              </section>

              <p className="text-center text-[11px] text-red-100/55">
                Open <span className="text-[#F5D76E]">Patterns</span> for pictured win samples.
              </p>
            </div>
          )}

          {tab === "patterns" && (
            <div className="space-y-4">
              <p className="text-xs text-red-100/70">
                Example winning layouts. Strip icons show the in-game symbols.
              </p>

              <SampleCard
                title="Three+ Matching Cards"
                criteria="Same paying symbol on 3 or more adjacent reels starting from reel 1. Ways = product of match counts per reel. Jokers can fill any paying position."
                img={HOWTO_IMG.threeCards}
                strip={["sym_a", "little_joker", "sym_a"]}
                payout="Paytable × ways × cascade multiplier × bet"
              />

              <SampleCard
                title="Golden Card → Joker"
                criteria="A Golden Card on reels 2–4 that is part of a win transforms into Little Joker or Big Joker instead of vanishing, seeding the next cascade."
                img={HOWTO_IMG.goldenJoker}
                strip={["sym_a", "ace_gold", "sym_a"]}
                payout="Hidden cascade booster — Joker stays for the next drop"
              />

              <SampleCard
                title="Cascade Combo Ladder"
                criteria="Each successful cascade in a spin climbs the multiplier ladder. Ladder resets at the start of every new spin (including each Free Spin)."
                img={HOWTO_IMG.cascade}
                strip={["heart", "heart", "heart", "heart"]}
                payout={`Base ${baseMult} · Free Spins ${fsMult}`}
              />

              <SampleCard
                title="Scatter Free Spins"
                criteria={`${cfg.freeSpinsTriggerCount}+ Scatters anywhere on the grid (counted across the whole cascade sequence) award Free Spins. During Free Spins, ${cfg.freeSpinsTriggerCount}+ Scatters add +${cfg.freeSpinsRetriggerCount} with no cap.`}
                img={HOWTO_IMG.freeSpins}
                strip={["scatter", "scatter", "scatter"]}
                payout={`${cfg.freeSpinsBaseCount} FS · retrigger +${cfg.freeSpinsRetriggerCount} uncapped`}
              />

              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-2 text-sm font-black text-[#F5D76E]">No-pay examples</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <PatternStrip
                    kinds={["sym_a", "scatter", "sym_a"]}
                    label="Broken sequence — no Ace ways"
                  />
                  <PatternStrip
                    kinds={["sym_j", "sym_q", "sym_k"]}
                    label="Mixed ranks — no match"
                  />
                </div>
              </section>
            </div>
          )}

          {tab === "pays" && (
            <div className="space-y-2">
              <p className="mb-2 text-xs text-red-100/70">
                Pays are × bet for 3 / 4 / 5 consecutive reels, then × ways × cascade multiplier.
                Values are provisional / config-pending. Max win{" "}
                {cfg.maxWinMult.toLocaleString()}×.
              </p>
              {PAY_ORDER.map((kind) => {
                const sym = cfg.symbols.find((s) => s.kind === kind);
                if (!sym) return null;
                return (
                  <div
                    key={kind}
                    className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-black/30 px-2 py-1.5"
                  >
                    <div className="size-12 shrink-0">
                      <WildAceIcon kind={kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#F5D76E]">
                        {SYMBOL_NAMES[kind] ?? sym.name}
                      </div>
                      {sym.wild ? (
                        <div className="text-[11px] text-red-100/75">
                          Wild — substitutes for all paying symbols (not Scatter)
                        </div>
                      ) : sym.scatter ? (
                        <div className="text-[11px] tabular-nums text-red-100/75">
                          3+ anywhere → Free Spins · cash 3× {sym.pay[0]} · 4× {sym.pay[1]} · 5×{" "}
                          {sym.pay[2]}
                        </div>
                      ) : (
                        <div className="text-[11px] tabular-nums text-red-100/75">
                          3× {sym.pay[0]} · 4× {sym.pay[1]} · 5× {sym.pay[2]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "rules" && (
            <div className="space-y-3 text-xs leading-relaxed text-red-50/85">
              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-[#F5D76E]">Golden Cards & Jokers</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Golden plating can appear on reels 2–4 only.</li>
                  <li>
                    When a Golden Card is in a winning way, it becomes Little or Big Joker for the
                    next cascade (weighted config).
                  </li>
                  <li>Both Jokers substitute equally — Big Joker is rarer.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-[#F5D76E]">Cascades & multipliers</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Winning symbols tumble off; remaining cards drop; new cards fill from above.</li>
                  <li>Base ladder: {baseMult}</li>
                  <li>Free Spins ladder: {fsMult}</li>
                  <li>Multiplier resets every new spin (including each Free Spin).</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-[#F5D76E]">Free Spins</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    {cfg.freeSpinsTriggerCount}+ Scatters → {cfg.freeSpinsBaseCount} Free Spins
                  </li>
                  <li>
                    Retrigger during Free Spins: +{cfg.freeSpinsRetriggerCount} (no cap)
                  </li>
                  <li>Golden Cards & Jokers appear more often in Free Spins.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-[#F5D76E]">Bet · Ante · Buy</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-bold">Ante</span> — ×{cfg.anteBetMult} stake, boosts
                    Scatter weight
                  </li>
                  <li>
                    <span className="font-bold">Buy Free Spins</span> — ×{cfg.buyFeatureMult} bet
                  </li>
                  <li>
                    <span className="font-bold">Max win</span> — {cfg.maxWinMult.toLocaleString()}×
                    stake across the full resolution
                  </li>
                  <li>
                    <span className="font-bold">Turbo / Autoplay</span> — UI only; math unchanged
                  </li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-[#F5D76E]">RTP profile</h3>
                <p>
                  Active profile <span className="font-bold text-[#F5D76E]">{cfg.activeRtpProfile}</span>{" "}
                  · target {cfg.targetRtp}% (provisional / operator-selectable).
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
