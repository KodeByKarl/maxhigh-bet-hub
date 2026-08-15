import { X } from "lucide-react";
import { SYMBOL_NAMES, type StarlightWaysSymKind } from "@/lib/starlight-ways-config";
import { getStarlightWaysConfig } from "./runtimeConfig";
import { StarlightWaysIcon } from "./StarlightWaysIcon";

type PaytableModalProps = {
  open: boolean;
  onClose: () => void;
};

const ORDER: StarlightWaysSymKind[] = [
  "comet",
  "princess",
  "castle",
  "star",
  "moon",
  "sym_a",
  "sym_k",
  "sym_q",
  "sym_j",
  "sym_10",
  "wild",
  "scatter",
];

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  if (!open) return null;
  const cfg = getStarlightWaysConfig();
  const ways =
    Math.pow(cfg.maxReelHeight, cfg.reelsCount) ||
    cfg.reelsCount * cfg.maxReelHeight;

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-[#E8C547]/60 p-[3px] shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, #FFF6C8 0%, #E9D5FF 40%, #C4B5FD 70%, #F5D76E 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Starlight Ways info"
      >
        <div
          className="rounded-[0.9rem] p-4"
          style={{
            background:
              "linear-gradient(180deg, rgba(76,29,149,0.98) 0%, rgba(46,16,101,0.99) 100%)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#F5D76E]">Starlight Ways · Info</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E8C547]/50 p-1.5 text-[#F5D76E] transition hover:bg-white/10"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mb-3 text-xs text-fuchsia-100/75">
            {cfg.reelsCount}×{cfg.maxReelHeight} · {ways.toLocaleString()} ways · left-to-right.
            Pays are × bet for 3 / 4 / 5 matching symbols. Target RTP {cfg.targetRtp}%
            (provisional).
          </p>

          <div className="space-y-2">
            {ORDER.map((kind) => {
              const sym = cfg.symbols.find((s) => s.kind === kind);
              if (!sym) return null;
              return (
                <div
                  key={kind}
                  className="flex items-center gap-3 rounded-xl border border-[#E8C547]/25 bg-black/25 px-2 py-1.5"
                >
                  <div className="size-12 shrink-0">
                    <StarlightWaysIcon kind={kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#F5D76E]">
                      {SYMBOL_NAMES[kind] ?? sym.name}
                    </div>
                    {sym.wild ? (
                      <div className="text-[11px] text-fuchsia-100/80">
                        Substitutes for all except Scatter
                      </div>
                    ) : sym.scatter ? (
                      <div className="text-[11px] tabular-nums text-fuchsia-100/80">
                        3+ awards Free Spins · pay 3× {sym.pay[0]} · 4× {sym.pay[1]} · 5×{" "}
                        {sym.pay[2]}
                      </div>
                    ) : (
                      <div className="text-[11px] tabular-nums text-fuchsia-100/75">
                        3× {sym.pay[0]} · 4× {sym.pay[1]} · 5× {sym.pay[2]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 rounded-xl border border-[#E8C547]/35 bg-black/30 p-3 text-[11px] text-fuchsia-100/90">
            <p>
              <strong className="text-[#F5D76E]">Golden symbols:</strong> on win, gold tiles
              transform into Wilds for the next cascade.
            </p>
            <p>
              <strong className="text-[#F5D76E]">Cascade multipliers:</strong> base{" "}
              {cfg.baseCascadeMultipliers.map((m) => `×${m}`).join(" → ")} · Free Spins{" "}
              {cfg.freeSpinsCascadeMultipliers.map((m) => `×${m}`).join(" → ")} (resets each FS
              spin).
            </p>
            <p>
              <strong className="text-[#F5D76E]">Free Spins:</strong> {cfg.freeSpinsTriggerCount}+
              scatters → {cfg.freeSpinsBaseCount} spins +{cfg.freeSpinsExtraPerScatter} per extra.
              Guaranteed Golden Reel: #{cfg.guaranteedGoldenReelIndex + 1}.
            </p>
            <p>
              <strong className="text-[#F5D76E]">Ante:</strong> ×{cfg.anteBetMult} stake, boosts
              scatter weight. <strong className="text-[#F5D76E]">Buy:</strong> ×
              {cfg.buyFeatureMult} bet.
            </p>
            <p>
              <strong className="text-[#F5D76E]">Max win:</strong> {cfg.maxWinMult.toLocaleString()}
              × stake.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
