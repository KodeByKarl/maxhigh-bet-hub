"use client";

import { X } from "lucide-react";
import type { PlBuyOptionConfig } from "@/lib/pug-life-config";
import { BET_STEPS } from "./animationConfig";
import { PugDenIcon } from "./PugDenIcon";
import { getPugLifeConfig } from "./runtimeConfig";

export type BuyId = PlBuyOptionConfig["id"];

type BuyFeatureModalProps = {
  open: boolean;
  bet: number;
  balance: number;
  locked?: boolean;
  onBetChange: (bet: number) => void;
  onBuy: (buyId: BuyId) => void;
  onClose: () => void;
};

const BUY_COPY: Record<
  BuyId,
  { title: string; blurb: string; accent: string; icons: ("treat_biscuit" | "treat_bone" | "treat_steak" | "scatter" | "toaster" | "pug")[] }
> = {
  featurespins: {
    title: "FeatureSpins",
    blurb: "Batch of paid spins with FeatureSpins reel weighting — chase bonuses faster.",
    accent: "from-amber-500/25 to-yellow-700/20",
    icons: ["pug", "treat_biscuit", "scatter"],
  },
  treat_yoself: {
    title: "Treat Yo'Self",
    blurb: "Jump straight into sticky Treat free spins with lives and stacked wild multipliers.",
    accent: "from-pink-500/25 to-rose-800/20",
    icons: ["treat_biscuit", "treat_bone", "treat_steak"],
  },
  dawgs_den: {
    title: "Dawg's Den",
    blurb: "Enter Dawg's Den free spins with sticky Toasters feeding a pooled pot.",
    accent: "from-orange-500/25 to-amber-900/25",
    icons: ["scatter", "scatter", "toaster"],
  },
};

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BuyFeatureModal({
  open,
  bet,
  balance,
  locked,
  onBetChange,
  onBuy,
  onClose,
}: BuyFeatureModalProps) {
  if (!open) return null;

  const cfg = getPugLifeConfig();
  const found = BET_STEPS.findIndex((v) => v >= bet);
  const stepIdx = found === -1 ? BET_STEPS.length - 1 : found;
  const canMinus = stepIdx > 0 && !locked;
  const canPlus = stepIdx < BET_STEPS.length - 1 && !locked;

  const nudge = (dir: -1 | 1) => {
    const next = BET_STEPS[stepIdx + dir];
    if (next != null) onBetChange(next);
  };

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bonus Buy"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-amber-500/45 bg-gradient-to-b from-[#3f2a14]/98 via-[#1c140c]/98 to-[#0c0805]/98 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/25 px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-amber-100">Bonus Buy</h2>
            <p className="text-[10px] text-amber-200/60">Skip the wait · buy a feature path</p>
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {/* Stake */}
          <div className="rounded-2xl border border-amber-600/30 bg-black/35 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80">
              Stake
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={!canMinus}
                onClick={() => nudge(-1)}
                className="grid size-10 place-items-center rounded-xl border border-amber-500/40 bg-[#2a1a0c] text-lg font-black text-amber-100 disabled:opacity-40"
              >
                −
              </button>
              <div className="min-w-[7rem] rounded-xl border border-amber-500/40 bg-gradient-to-b from-[#3a2410] to-[#140c06] px-3 py-2 font-black tabular-nums text-amber-100">
                {formatMoney(bet)}
              </div>
              <button
                type="button"
                disabled={!canPlus}
                onClick={() => nudge(1)}
                className="grid size-10 place-items-center rounded-xl border border-amber-500/40 bg-[#2a1a0c] text-lg font-black text-amber-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-amber-200/50">
              Balance {formatMoney(balance)}
            </div>
          </div>

          {cfg.buyOptions.map((opt) => {
            const copy = BUY_COPY[opt.id];
            const cost = opt.costMult > 0 ? +(bet * opt.costMult).toFixed(2) : 0;
            const canBuy =
              opt.enabled && opt.costMult > 0 && balance >= cost && !locked;
            const blockedReason =
              !opt.enabled
                ? "Disabled"
                : opt.costMult <= 0
                  ? "Cost pending"
                  : balance < cost
                    ? "Insufficient balance"
                    : locked
                      ? "Busy"
                      : null;

            return (
              <article
                key={opt.id}
                className={`rounded-2xl border border-amber-600/30 bg-gradient-to-br p-3 ${copy.accent}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {copy.icons.map((kind, i) => (
                    <div key={`${opt.id}-${kind}-${i}`} className="size-9 shrink-0 sm:size-10">
                      <PugDenIcon kind={kind} framed={false} />
                    </div>
                  ))}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-amber-50">{copy.title}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                      {opt.costMult > 0 ? `${opt.costMult}× stake` : "Cost TBD"}
                    </p>
                  </div>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-white/75">{copy.blurb}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-left">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                      Cost
                    </div>
                    <div className="text-lg font-black tabular-nums text-amber-100">
                      {opt.costMult > 0 ? formatMoney(cost) : "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onBuy(opt.id)}
                    className="rounded-xl border border-amber-300/60 bg-gradient-to-b from-amber-400 to-orange-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-amber-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40 hover:brightness-110"
                  >
                    {canBuy ? "Buy" : blockedReason ?? "Unavailable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
