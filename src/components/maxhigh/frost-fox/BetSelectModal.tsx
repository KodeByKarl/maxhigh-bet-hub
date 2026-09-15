import { motion } from "framer-motion";
import { X } from "lucide-react";
import { BET_STEPS } from "./paytable";

type Props = {
  currentBet: number;
  onSelectBet: (bet: number) => void;
  onClose: () => void;
};

export function BetSelectModal({ currentBet, onSelectBet, onClose }: Props) {
  const bets = BET_STEPS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[160] flex cursor-pointer items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-[2rem] border-2 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 text-center cursor-default"
        style={{
          borderColor: "color-mix(in srgb, var(--p-accent) 60%, transparent)",
          boxShadow: "0 0 50px var(--p-spin-shadow)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3
          className="mb-1 text-lg font-black uppercase tracking-wider drop-shadow-md sm:text-xl"
          style={{ color: "var(--p-modal-title)" }}
        >
          Select Bet Amount
        </h3>
        <p className="mb-5 text-xs text-white/50 font-medium">
          Choose a total bet size to wager per spin
        </p>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {bets.map((val) => {
            const isSelected = val === currentBet;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onSelectBet(val);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 font-black transition border ${
                  isSelected
                    ? "scale-105"
                    : "border-white/10 bg-neutral-800/80 text-white hover:bg-neutral-700"
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: "var(--p-accent-soft)",
                        background:
                          "linear-gradient(180deg, var(--p-spin-from) 0%, var(--p-spin-mid) 50%, var(--p-spin-to) 100%)",
                        color: "var(--p-accent-deep)",
                        boxShadow: "0 0 15px var(--p-spin-shadow)",
                      }
                    : undefined
                }
              >
                <span className="text-[10px] opacity-70 uppercase tracking-tight font-bold">
                  Bet
                </span>
                <span className="text-sm sm:text-base tabular-nums">
                  ₱{val.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
