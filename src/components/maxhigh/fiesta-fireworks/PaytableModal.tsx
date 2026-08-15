import { X } from "lucide-react";
import { SYMBOL_NAMES, type CnySymKind } from "@/lib/fiesta-fireworks-config";
import { getFiestaFireworksConfig } from "./runtimeConfig";
import { FiestaFireworksIcon } from "./FiestaFireworksIcon";

type PaytableModalProps = {
  open: boolean;
  onClose: () => void;
};

const ORDER: CnySymKind[] = [
  "lantern",
  "lion",
  "fish",
  "coins",
  "jug",
  "sym_a",
  "sym_k",
  "sym_q",
  "sym_j",
  "sym_10",
  "dragon",
  "monkey",
];

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  if (!open) return null;
  const cfg = getFiestaFireworksConfig();

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-yellow-600/50 bg-gradient-to-b from-red-950 to-stone-950 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-yellow-200">Fiesta Fireworks · Info</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-yellow-700/60 p-1.5 text-yellow-100 hover:bg-yellow-900/40"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-yellow-100/70">
          5×{cfg.rowsCount} · {cfg.paylineCount} fixed paylines · left-to-right. Values are ×
          bet-per-line for 3 / 4 / 5. Paytable &amp; RTP pending compliance sign-off (target{" "}
          {cfg.targetRtp}%).
        </p>

        <div className="space-y-2">
          {ORDER.map((kind) => {
            const sym = cfg.symbols.find((s) => s.kind === kind);
            if (!sym) return null;
            return (
              <div
                key={kind}
                className="flex items-center gap-3 rounded-xl border border-yellow-800/40 bg-black/30 px-2 py-1.5"
              >
                <div className="size-12 shrink-0">
                  <FiestaFireworksIcon kind={kind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-yellow-100">{SYMBOL_NAMES[kind]}</div>
                  {sym.tier === "feature" ? (
                    <div className="text-[11px] text-amber-200/80">
                      {kind === "dragon"
                        ? "Trigger on reels 3–5 → Dragon Fireworks"
                        : "Trigger on reels 1,3,5 → Free Spins + 5× bet"}
                    </div>
                  ) : (
                    <div className="text-[11px] tabular-nums text-yellow-100/75">
                      3× {sym.pay[0]} · 4× {sym.pay[1]} · 5× {sym.pay[2]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-1 rounded-xl border border-amber-700/40 bg-amber-950/30 p-3 text-[11px] text-amber-100/85">
          <p>
            <strong>Dragon Fireworks:</strong> launch until a bust; coin awards accumulate.
          </p>
          <p>
            <strong>Monkey Free Spins:</strong> {cfg.freeSpinsAward} spins (config-pending), Extra
            Scatter wheel, no retriggers.
          </p>
          <p>
            <strong>Gamble:</strong> red/black double-or-nothing, max {cfg.gambleMaxRounds} rounds
            (format pending confirmation).
          </p>
          <p>
            <strong>Max win:</strong> {cfg.maxWinMult}× stake.
          </p>
        </div>
      </div>
    </div>
  );
}
