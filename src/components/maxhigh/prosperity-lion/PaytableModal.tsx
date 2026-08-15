import { X } from "lucide-react";
import {
  FT_MULTIPLIER_VALUES,
  SYMBOL_NAMES,
  type FtSymKind,
} from "@/lib/prosperity-lion-config";
import { ProsperityLionIcon } from "./ProsperityLionIcon";
import { getProsperityLionConfig } from "./runtimeConfig";

type PaytableModalProps = {
  open: boolean;
  onClose: () => void;
};

const SYM_ORDER: FtSymKind[] = [
  "wild",
  "ruby",
  "emerald",
  "sapphire",
  "amethyst",
  "topaz",
  "temple",
];

const PAYLINE_LABELS = [
  "Middle row",
  "Top row",
  "Bottom row",
  "Diagonal ↘",
  "Diagonal ↗",
];

/** Tiny 3×3 payline preview */
function PaylinePreview({ path, index }: { path: number[]; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid grid-cols-3 gap-0.5 rounded-md border border-amber-600/40 bg-black/40 p-1">
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 3 }, (_, reel) => {
            const on = path[reel] === row;
            return (
              <div
                key={`${reel}-${row}`}
                className={`size-3 rounded-[2px] sm:size-3.5 ${
                  on
                    ? "bg-gradient-to-b from-amber-300 to-rose-500 shadow-[0_0_6px_rgba(251,191,36,0.7)]"
                    : "bg-stone-800/80"
                }`}
              />
            );
          }),
        ).flat()}
      </div>
      <p className="text-[9px] font-semibold text-amber-200/75">
        L{index + 1} · {PAYLINE_LABELS[index] ?? `Line ${index + 1}`}
      </p>
    </div>
  );
}

export function PaytableModal({ open, onClose }: PaytableModalProps) {
  if (!open) return null;
  const cfg = getProsperityLionConfig();
  const bplNote = "× bet-per-line (total bet ÷ 5 lines)";

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-4">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-500/50 bg-gradient-to-b from-[#3a1408] via-[#1a0a0c] to-[#08040a] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-amber-100">
              Prosperity Lion · Info
            </h2>
            <p className="text-[10px] text-amber-200/60">
              3×3 · 5 fixed paylines · multiplier reel · no free spins
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-600/60 p-1.5 text-amber-100 hover:bg-amber-900/40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* How it works */}
        <section className="mb-4 rounded-xl border border-amber-700/40 bg-black/25 p-3">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
            How it works
          </h3>
          <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-amber-100/85">
            <li>Choose bet. Optionally turn on <strong>EX</strong> (+50% stake, better mult odds).</li>
            <li>Spin resolves server-side: 3×3 gem grid + separate multiplier reel.</li>
            <li>Any of the <strong>5 paylines</strong> with 3 matching symbols pays (Wild substitutes).</li>
            <li>If there is a payline win, the <strong>center</strong> multiplier reel value multiplies the total.</li>
            <li>Final payout is capped at <strong>{cfg.maxWinMult}×</strong> stake (provisional).</li>
          </ol>
          <p className="mt-2 text-[10px] text-amber-200/55">
            Single-pass base game only — no scatters, free spins, cascade, ways, or bonus round.
          </p>
        </section>

        {/* Paylines */}
        <section className="mb-4 rounded-xl border border-amber-700/40 bg-black/25 p-3">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
            5 fixed paylines
          </h3>
          <p className="mb-3 text-[10px] text-amber-100/70">
            Win = 3 matching symbols along a highlighted path. Paths are config-pending with design.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {cfg.paylines.slice(0, cfg.paylineCount).map((path, i) => (
              <PaylinePreview key={i} path={path} index={i} />
            ))}
          </div>
        </section>

        {/* Paytable */}
        <section className="mb-4 rounded-xl border border-amber-700/40 bg-black/25 p-3">
          <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-amber-300">
            Paytable
          </h3>
          <p className="mb-3 text-[10px] text-amber-100/65">
            3-of-a-kind pays {bplNote}. Values provisional — confirm before launch.
          </p>
          <div className="space-y-1.5">
            {SYM_ORDER.map((kind) => {
              const sym = cfg.symbols.find((s) => s.kind === kind);
              if (!sym) return null;
              return (
                <div
                  key={kind}
                  className="flex items-center gap-3 rounded-xl border border-amber-800/40 bg-black/30 px-2 py-1.5"
                >
                  <div className="size-11 shrink-0 sm:size-12">
                    <ProsperityLionIcon kind={kind} framed={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-amber-100">
                      {SYMBOL_NAMES[kind]}
                      {sym.wild ? (
                        <span className="ml-2 rounded bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-200">
                          Wild
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] tabular-nums text-amber-100/75">
                      3× → <strong className="text-amber-50">{sym.pay}</strong> {bplNote}
                    </div>
                    {sym.wild ? (
                      <div className="text-[10px] text-amber-200/70">
                        Substitutes for all regular gems. All-Wild line pays Wild.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Multiplier reel */}
        <section className="mb-4 rounded-xl border border-amber-700/40 bg-black/25 p-3">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
            Multiplier reel
          </h3>
          <p className="mb-2 text-[11px] leading-relaxed text-amber-100/85">
            A separate 4th reel spins every spin. The <strong>center</strong> face is the active
            multiplier for that spin. Applied only when a payline win exists (×0 stays 0).
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FT_MULTIPLIER_VALUES.map((v) => (
              <span
                key={v}
                className="rounded-full border border-amber-400/50 bg-gradient-to-b from-amber-500/30 to-amber-950/60 px-2.5 py-1 text-xs font-black tabular-nums text-amber-100"
              >
                {v}×
              </span>
            ))}
          </div>
          <p className="text-[10px] text-amber-200/55">
            Faces always generate for display/audit; payout uses center only with a base win.
          </p>
        </section>

        {/* EX mode */}
        <section className="mb-4 rounded-xl border border-rose-600/40 bg-rose-950/25 p-3">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-rose-200">
            Extra Bet (EX)
          </h3>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-rose-50/85">
            <li>
              Toggle <strong>before</strong> the spin — not retroactive.
            </li>
            <li>
              Stake becomes <strong>{cfg.exBetMult}×</strong> your selected bet (+50% default).
            </li>
            <li>
              Uses a <strong>separate</strong> multiplier-reel strip (working default:{" "}
              <strong>1× removed</strong>; higher faces more common than base).
            </li>
          </ul>
        </section>

        {/* Rules / limits */}
        <section className="rounded-xl border border-amber-700/40 bg-amber-950/25 p-3 text-[11px] text-amber-100/85">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
            Rules &amp; limits
          </h3>
          <ul className="space-y-1">
            <li>
              Bet range: ₱{cfg.minBet.toFixed(2)} – ₱{cfg.maxBet.toFixed(2)} (before EX).
            </li>
            <li>
              Max win: <strong>{cfg.maxWinMult}×</strong> stake (single-sourced / unconfirmed).
            </li>
            <li>
              Target RTP profile: <strong>{cfg.targetRtp}%</strong> (placeholder — confirm with
              design).
            </li>
            <li>Volatility: low-to-medium.</li>
            <li>Turbo / Autoplay are UI-only — same server resolution.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
