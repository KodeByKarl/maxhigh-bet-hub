"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PlSymKind } from "@/lib/pug-life-config";
import { SYM_LABEL } from "./animationConfig";
import { PugDenIcon } from "./PugDenIcon";
import { getPugLifeConfig } from "./runtimeConfig";

type PaytableModalProps = {
  open: boolean;
  onClose: () => void;
};

type TabId = "howto" | "features" | "pays" | "rules";

const TABS: { id: TabId; label: string }[] = [
  { id: "howto", label: "How to Win" },
  { id: "features", label: "Features" },
  { id: "pays", label: "Pays" },
  { id: "rules", label: "Rules" },
];

const PAY_ORDER: PlSymKind[] = [
  "pug",
  "chihuahua",
  "cat",
  "pigeon",
  "rat",
  "sym_a",
  "sym_k",
  "sym_q",
  "sym_j",
  "sym_10",
  "treat_biscuit",
  "treat_bone",
  "treat_steak",
  "scatter",
  "toaster",
];

const HOWTO_IMG = {
  paylines: "/images/pug-den/howto/win-paylines.webp?v=3",
  treats: "/images/pug-den/howto/win-treats.webp?v=3",
  treatYoSelf: "/images/pug-den/howto/win-treat-yoself.webp?v=3",
  dawgsDen: "/images/pug-den/howto/win-dawgs-den.webp?v=3",
} as const;

function PatternStrip({ kinds, label }: { kinds: PlSymKind[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-2xl border border-amber-500/30 bg-black/40 px-2 py-1.5">
        {kinds.map((k, i) => (
          <div key={`${k}-${i}`} className="size-10 shrink-0 sm:size-11">
            <PugDenIcon kind={k} framed={false} />
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
  strip: PlSymKind[];
  payout: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-amber-600/30 bg-black/35">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-8">
          <h4 className="text-sm font-black text-amber-100">{title}</h4>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <PatternStrip kinds={strip} label="In-game symbols" />
        <p className="text-[11px] leading-relaxed text-white/75">{criteria}</p>
        <p className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-center text-xs font-bold text-amber-100">
          {payout}
        </p>
      </div>
    </article>
  );
}

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  const [tab, setTab] = useState<TabId>("howto");
  if (!open) return null;

  const cfg = getPugLifeConfig();
  const tys = cfg.treatYoSelf;
  const den = cfg.dawgsDen;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-[#3f2a14]/98 via-[#1c140c]/98 to-[#0c0805]/98 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/20 px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-amber-100">Pug Den · How to Win</h2>
            <p className="text-[10px] text-amber-200/60">
              Diamond {cfg.reelHeights?.join("-") ?? "3-4-5-4-3"} · {cfg.paylineCount}{" "}
              connecting ways · max {cfg.maxWinMult}×
            </p>
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
                  ? "shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-[11px] font-black text-amber-950"
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
                <h3 className="text-sm font-black uppercase tracking-wide text-amber-200">
                  Connecting Ways
                </h3>
                <div className="overflow-hidden rounded-2xl border border-amber-600/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HOWTO_IMG.paylines}
                    alt="3-4-5-4-3 diamond connecting ways"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <p className="text-xs leading-relaxed text-white/80">
                  The board is a{" "}
                  <span className="font-bold text-amber-100">
                    {cfg.reelHeights?.join("-") ?? "3-4-5-4-3"}
                  </span>{" "}
                  diamond with circular cells and{" "}
                  <span className="font-bold text-amber-100">{cfg.paylineCount} connecting ways</span>.
                  Wins pay{" "}
                  <span className="font-bold text-amber-100">left to right</span> — land{" "}
                  <span className="font-bold text-amber-100">
                    {cfg.minMatchLength}+ matching symbols
                  </span>{" "}
                  on consecutive reels (any row). Multiple matches on a reel multiply the ways.
                </p>
              </section>

              <section className="space-y-2 rounded-2xl border border-amber-600/25 bg-black/30 p-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-amber-200">
                  Win criteria (summary)
                </h3>
                <ul className="space-y-2 text-xs text-white/80">
                  <li>
                    <span className="font-bold text-amber-200">3 / 4 / 5+ consecutive reels</span> →
                    symbol pay × total bet × ways
                  </li>
                  <li>
                    <span className="font-bold text-orange-200">Treat Wilds</span> (Biscuit, Bone,
                    Steak) substitute and add stacked multipliers
                  </li>
                  <li>
                    <span className="font-bold text-pink-200">Treat Yo&apos;Self</span> — land{" "}
                    {tys.triggerTreatCount}+ Treats for sticky free spins
                  </li>
                  <li>
                    <span className="font-bold text-emerald-200">Dawg&apos;s Den</span> —{" "}
                    {den.triggerScatterCount}+ Scatters for free spins + Toaster pot
                  </li>
                </ul>
              </section>

              <p className="text-center text-[11px] text-white/55">
                Open <span className="text-amber-200">Features</span> for pictured bonus samples.
              </p>
            </div>
          )}

          {tab === "features" && (
            <div className="space-y-4">
              <p className="text-xs text-white/70">
                Bonus features and special symbols. Strip icons match in-game art.
              </p>

              <SampleCard
                title="Treat Wilds"
                criteria="Biscuit, Bone, and Steak act as Wilds. Each reveals a multiplier; when several Treats land on the same paying line, multipliers stack together."
                img={HOWTO_IMG.treats}
                strip={["treat_biscuit", "treat_bone", "treat_steak"]}
                payout="Wild substitute + stacked × on connecting ways"
              />

              <SampleCard
                title="Treat Yo'Self"
                criteria={`Land ${tys.triggerTreatCount}+ Treat Wilds in view to trigger sticky free spins. New Treats stick; spins continue while lives remain.`}
                img={HOWTO_IMG.treatYoSelf}
                strip={["treat_biscuit", "treat_bone", "treat_steak", "pug"]}
                payout={`${tys.initialSpins} spins · ${tys.initialLives} lives · sticky Treats`}
              />

              <SampleCard
                title="Dawg's Den"
                criteria={`Land ${den.triggerScatterCount}+ Doghouse Scatters to enter Dawg's Den. Free spins build a pooled pot. Sticky Toasters on center reels can add cash or multipliers into the pot — paid as a lump sum when the bonus ends.`}
                img={HOWTO_IMG.dawgsDen}
                strip={["scatter", "scatter", "scatter", "toaster"]}
                payout="Pooled pot paid at bonus end"
              />
            </div>
          )}

          {tab === "pays" && (
            <div className="space-y-2">
              <p className="mb-2 text-xs text-white/70">
                Pays are × total bet × ways for 3 / 4 / 5+ consecutive reels (₱{cfg.minBet}–₱
                {cfg.maxBet} stake). Values may be config-pending.
              </p>
              {PAY_ORDER.map((kind) => {
                const sym = cfg.symbols.find((s) => s.kind === kind);
                if (!sym) return null;
                const isSpecial =
                  kind.startsWith("treat_") || kind === "scatter" || kind === "toaster";
                return (
                  <div
                    key={kind}
                    className="flex items-center gap-3 rounded-xl border border-amber-700/30 bg-black/30 px-2 py-1.5"
                  >
                    <div className="size-12 shrink-0">
                      <PugDenIcon kind={kind} framed={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">
                        {sym.name || SYM_LABEL[kind]}
                      </div>
                      {isSpecial ? (
                        <div className="text-[11px] text-amber-100/80">
                          {kind.startsWith("treat_") && "Wild · multiplier treat"}
                          {kind === "scatter" && "Triggers Dawg's Den"}
                          {kind === "toaster" && "Dawg's Den pot booster (center reels)"}
                        </div>
                      ) : (
                        <div className="text-[11px] tabular-nums text-white/70">
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
            <div className="space-y-3 text-xs leading-relaxed text-white/80">
              <section className="rounded-2xl border border-amber-600/25 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-amber-200">Base game</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Diamond {cfg.reelHeights?.join("-") ?? "3-4-5-4-3"} · {cfg.paylineCount}{" "}
                    connecting ways.
                  </li>
                  <li>
                    Match {cfg.minMatchLength}+ identical symbols left-to-right on consecutive
                    reels (any rows).
                  </li>
                  <li>Max win capped at {cfg.maxWinMult}× total stake.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-600/25 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-amber-200">Treat Wilds</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Biscuit, Bone, and Steak substitute for paying symbols.</li>
                  <li>Each Treat carries a multiplier; stacked Treats multiply together.</li>
                  <li>Five Treats on a line also award a flat stake boost.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-600/25 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-amber-200">Bonus buy</h3>
                <p>
                  FeatureSpins, Treat Yo&apos;Self, and Dawg&apos;s Den buys may be available from
                  the Buy menu. Disabled in restricted markets (e.g. UK). Costs/RTP are
                  config-pending until sign-off.
                </p>
              </section>

              <section className="rounded-2xl border border-amber-600/25 bg-black/30 p-3">
                <h3 className="mb-1.5 text-sm font-black text-amber-200">Controls</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-bold">Bet − / +</span> — adjust stake
                  </li>
                  <li>
                    <span className="font-bold">Auto</span> — continuous spins
                  </li>
                  <li>
                    <span className="font-bold">Turbo</span> — faster reel timing
                  </li>
                  <li>
                    <span className="font-bold">Info</span> — this paytable
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
