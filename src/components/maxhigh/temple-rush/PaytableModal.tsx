import { motion } from "framer-motion";
import { X } from "lucide-react";
import { TempleRushIcon } from "./TempleRushIcon";
import { getRuntimeSymbols } from "./runtimeConfig";
import { getTempleRushConfig } from "./runtimeConfig";

type Props = {
  bet: number;
  onClose: () => void;
};

/** Paytable / how-to-play overlay. */
export function PaytableModal({ bet, onClose }: Props) {
  const cfg = getTempleRushConfig();
  const pays = getRuntimeSymbols().filter((s) => !s.scatter && !s.bomb);
  const minCluster = cfg.minCluster;

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
            "linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #78350F 100%)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[min(84dvh,700px)] flex-col overflow-hidden rounded-[1.1rem]"
          style={{
            background: "linear-gradient(180deg, #064E3B 0%, #022014 100%)",
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-amber-300/20 px-4 py-3">
            <div>
              <div className="text-lg font-black uppercase tracking-wide text-yellow-300">
                Paytable
              </div>
              <div className="text-[11px] font-bold text-emerald-200/80">
                Cluster pays · {minCluster}+ matching symbols
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full border-2 border-amber-300/80 bg-[#064E3B] text-yellow-300"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="rounded-xl bg-black/25 px-3 py-2 text-[11px] font-semibold leading-relaxed text-white/90">
              Symbols pay anywhere on the grid. Land {minCluster} or more of the
              same symbol to win. Winning symbols tumble away and new ones drop
              in. {cfg.freeSpinsTriggerCount}+ lollipops trigger Free Spins. Bombs multiply the tumble win.
            </div>

            <div className="grid gap-2">
              {pays.map((sym) => (
                <div
                  key={sym.id}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2"
                >
                  <TempleRushIcon kind={sym.kind} className="size-10 shrink-0" />
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center text-[10px] font-black tabular-nums text-white sm:text-[11px]">
                    <div>
                      <div className="text-white/55">{minCluster}–{minCluster + 1}</div>
                      <div className="text-[#F5D76E]">₱{(bet * sym.pay[0]).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-white/55">{minCluster + 2}–{minCluster + 3}</div>
                      <div className="text-[#F5D76E]">₱{(bet * sym.pay[1]).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-white/55">{minCluster + 4}+</div>
                      <div className="text-[#F5D76E]">₱{(bet * sym.pay[2]).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
              <TempleRushIcon kind="lollipop" className="size-10 shrink-0" />
              <div className="text-[11px] font-bold leading-snug text-white">
                <span className="text-[#F5D76E]">Scatter</span> — {cfg.freeSpinsTriggerCount}+ awards Free
                Spins. Pays cash by cane count.
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
              <TempleRushIcon kind="bomb" mult={2} className="size-10 shrink-0" />
              <div className="text-[11px] font-bold leading-snug text-white">
                <span className="text-[#F5D76E]">Bomb</span> — multiplies the
                current tumble win. Values collect during Free Spins.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
