import { motion } from "framer-motion";
import { BUY_BONUS_FREE_SPINS } from "@/lib/buy-bonus";

export type BuyFeatureModalProps = {
  bet: number;
  cost: number;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm Rebuy–style panther modal for Buy Feature. */
export function BuyFeatureModal({ bet, cost, balance, onConfirm, onCancel }: BuyFeatureModalProps) {
  const canAfford = balance >= cost;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm buy feature"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[3px]"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.82, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="relative w-full max-w-[400px] rounded-[1.6rem] p-[10px]"
        style={{
          background: "linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #064E3B 100%)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute -right-1 -top-1 z-10 grid size-9 place-items-center rounded-full border-2 border-amber-300 bg-red-600 text-lg font-black text-white shadow-lg hover:brightness-110"
        >
          ×
        </button>

        <div
          className="relative overflow-hidden rounded-[1.25rem] px-4 pb-5 pt-4"
          style={{
            background: "linear-gradient(180deg, #064E3B 0%, #022014 100%)",
          }}
        >
          <div
            className="relative text-center font-black uppercase tracking-wide text-yellow-300"
            style={{
              fontSize: "clamp(1.15rem, 4.5vw, 1.45rem)",
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            Buy Bonus
          </div>

          {/* Feature card */}
          <div
            className="relative mt-4 rounded-2xl border-2 border-amber-300 px-3 py-4 text-center"
            style={{
              background: "linear-gradient(180deg, #78350F 0%, #451A03 100%)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            }}
          >
            <div className="pointer-events-none absolute left-2 top-1 flex gap-1 text-yellow-300">
              <span>★</span>
              <span className="text-sm">★</span>
              <span>★</span>
            </div>
            <div className="pointer-events-none absolute right-2 top-1 flex gap-1 text-yellow-300">
              <span>★</span>
              <span className="text-sm">★</span>
              <span>★</span>
            </div>

            <div
              className="font-black uppercase tracking-wide text-emerald-200"
              style={{
                fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              Buy Bonus Price
            </div>
            <div
              className="mt-1 font-black tabular-nums leading-none text-yellow-300"
              style={{
                fontSize: "clamp(1.9rem, 8vw, 2.6rem)",
                textShadow: "0 3px 0 #78350F, 0 6px 10px rgba(0,0,0,0.5)",
              }}
            >
              ₱{cost.toFixed(2)}
            </div>
            <div className="mt-2 text-sm font-black uppercase tracking-wide text-emerald-100">
              Free Spins {BUY_BONUS_FREE_SPINS}
            </div>
          </div>

          {/* Current bet (the game's selected bet; change it in the game before buying) */}
          <div className="relative mt-5 text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              Current Bet
            </div>
            <div
              className="mx-auto mt-2 min-w-[120px] max-w-[200px] rounded-xl border-2 border-amber-300/60 px-4 py-2.5 text-center font-black tabular-nums text-yellow-300"
              style={{
                background: "linear-gradient(180deg, #065F46, #022014)",
                fontSize: "1.25rem",
                textShadow: "0 2px 0 #78350f",
              }}
            >
              ₱{bet.toFixed(2)}
            </div>
            {!canAfford && (
              <div className="mt-2 text-[11px] font-bold text-yellow-200">Insufficient balance</div>
            )}
          </div>

          {/* Actions */}
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border-[3px] border-white/70 py-3.5 text-lg font-black uppercase tracking-wide text-white shadow-lg hover:brightness-110"
              style={{
                background: "linear-gradient(180deg, #f87171 0%, #dc2626 55%, #b91c1c 100%)",
                textShadow: "0 2px 0 rgba(0,0,0,0.35)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canAfford}
              onClick={onConfirm}
              className="rounded-2xl border-[3px] border-white/70 py-3.5 text-lg font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-45 hover:brightness-110"
              style={{
                background: "linear-gradient(180deg, #bef264 0%, #84cc16 45%, #65a30d 100%)",
                textShadow: "0 2px 0 rgba(0,0,0,0.35)",
              }}
            >
              Confirm Buy Bonus
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
