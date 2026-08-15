import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatMoneyCompact } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { QUICK_BETS } from "./paytable";

type Props = {
  currentBet: number;
  onSelectBet: (bet: number) => void;
  onClose: () => void;
};

export function BetSelectModal({ currentBet, onSelectBet, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-[60] flex cursor-pointer items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border-2 border-yellow-500/70 bg-gradient-to-b from-red-950 via-[#1a0808] to-black p-4 text-center shadow-[0_0_40px_rgba(185,28,28,0.45)] cursor-default sm:p-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-[5px] border border-yellow-700/40 bg-black/40 text-yellow-100/80 hover:bg-black/60"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h3 className="mb-0.5 text-base font-black uppercase tracking-wider text-yellow-300 sm:text-lg">
          Select Bet
        </h3>
        <p className="mb-4 text-[11px] text-yellow-100/55">
          Quick picks · ₱0.50 – ₱100
        </p>

        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {QUICK_BETS.map((val) => {
            const selected = Math.abs(val - currentBet) < 1e-9;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onSelectBet(val);
                  onClose();
                }}
                className={cn(
                  "rounded-[5px] border px-1 py-2.5 font-black tabular-nums transition",
                  selected
                    ? "border-yellow-300 bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 shadow-[0_0_14px_rgba(245,158,11,0.55)] scale-[1.03]"
                    : "border-yellow-800/45 bg-black/45 text-yellow-100 hover:border-yellow-500/60 hover:bg-red-950/70",
                )}
              >
                <span className="block text-[9px] font-bold uppercase tracking-wide opacity-70">
                  Bet
                </span>
                <span className="text-sm sm:text-[15px]">{formatMoneyCompact(val)}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
