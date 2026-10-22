import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { RealmsGameDef } from "@/lib/realms";
import type { RealmsConfig } from "@/lib/realms/schema";
import type { SymbolArt } from "./ReelCell";
import { SymbolIcon } from "./SymbolIcon";

type Props = {
  def: RealmsGameDef;
  cfg: RealmsConfig;
  art: SymbolArt;
  bet: number;
  onClose: () => void;
};

const money = (n: number) => `₱${n.toFixed(2)}`;

/** Rules + pays, read live from the title's current config. */
export function PaytableModal({ def, cfg, art, bet, onClose }: Props) {
  const min = cfg.minCluster;
  const cells = def.board.cols * def.board.rows;
  const pays = [...cfg.symbols].filter((s) => !s.scatter && !s.bomb).reverse();
  const tiers = [...cfg.scatterCashTiers].sort((a, b) => a.count - b.count);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Paytable"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        className="relative max-h-[min(88dvh,720px)] w-full max-w-[520px] overflow-hidden rounded-[1.4rem] p-[8px]"
        style={{
          background:
            "linear-gradient(135deg, var(--p-modal-from) 0%, var(--p-modal-mid) 50%, var(--p-modal-to) 100%)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[min(84dvh,700px)] flex-col overflow-hidden rounded-[1.1rem]"
          style={{ background: "linear-gradient(180deg, var(--p-menu-to) 0%, #020617 100%)" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-3">
            <div>
              <div
                className="text-lg font-black uppercase tracking-wide"
                style={{ color: "var(--p-modal-title)" }}
              >
                {def.name}
              </div>
              <div
                className="text-[11px] font-bold"
                style={{ color: "color-mix(in srgb, var(--p-accent-soft) 80%, transparent)" }}
              >
                Cluster pays · {min}+ matching · win = bet × multiplier · max{" "}
                {cfg.maxWinMult.toLocaleString()}×
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full border-2"
              style={{
                borderColor: "color-mix(in srgb, var(--p-accent-soft) 80%, transparent)",
                background: "var(--p-menu-to)",
                color: "var(--p-modal-title)",
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="rounded-xl bg-black/25 px-3 py-2 text-[11px] font-semibold leading-relaxed text-white/90">
              Symbols pay anywhere on the {def.board.cols}×{def.board.rows} board ({cells} cells).
              Land {min} or more of the same symbol to win. Winning symbols tumble away and new ones
              drop in. {cfg.freeSpinsTriggerCount}+ {def.scatter.name} symbols award{" "}
              {cfg.freeSpinsBase} Free Spins.
            </div>

            <div className="grid gap-2">
              {pays.map((sym) => (
                <div
                  key={sym.id}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2"
                >
                  <div className="size-10 shrink-0">
                    <SymbolIcon
                      kind={sym.kind}
                      src={art[sym.kind].src}
                      label={art[sym.kind].label}
                    />
                  </div>
                  <div className="w-20 shrink-0 truncate text-[10px] font-black uppercase text-white/85">
                    {sym.label}
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center text-[10px] font-black tabular-nums text-white sm:text-[11px]">
                    {[`${min}–${min + 1}`, `${min + 2}–${min + 3}`, `${min + 4}+`].map(
                      (range, i) => (
                        <div key={range}>
                          <div className="text-white/55">{range}</div>
                          <div className="text-[color:var(--p-menu-accent)]">{sym.pay[i]}×</div>
                          <div className="text-[10px] font-bold text-white/70">
                            {money(bet * sym.pay[i])}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
              <div className="size-10 shrink-0">
                <SymbolIcon kind="scatter" src={art.scatter.src} label={art.scatter.label} />
              </div>
              <div className="text-[11px] font-bold leading-snug text-white">
                <span className="text-[color:var(--p-menu-accent)]">{def.scatter.name}</span> —{" "}
                {cfg.freeSpinsTriggerCount}+ award {cfg.freeSpinsBase} Free Spins (
                {cfg.freeSpinsRetriggerCount}+ during the feature add {cfg.freeSpinsRetrigger}).
                Base-game cash: {tiers.map((t) => `${t.count}+ pays ${t.mult}×`).join(" · ")}.
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
              <div className="size-10 shrink-0">
                <SymbolIcon kind="bomb" src={art.bomb.src} label={art.bomb.label} mult={2} />
              </div>
              <div className="text-[11px] font-bold leading-snug text-white">
                <span className="text-[color:var(--p-menu-accent)]">{def.bomb.name}</span> — 2×, 3×,
                4× or 5×. Multiplies the tumble win when it lands with a winning cluster. Free Spins
                keep the strongest one and apply it once at the end.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
