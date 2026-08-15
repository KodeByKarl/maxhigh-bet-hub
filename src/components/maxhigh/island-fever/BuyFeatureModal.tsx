import { motion } from "framer-motion";
import { BET_STEPS, getFreeSpinsBase } from "./paytable";

export type BuyFeatureModalProps = {
  bet: number;
  cost: number;
  balance: number;
  onBetChange: (bet: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm Rebuy–style candy modal for Buy Feature. */
export function BuyFeatureModal({
  bet,
  cost,
  balance,
  onBetChange,
  onConfirm,
  onCancel,
}: BuyFeatureModalProps) {
  const found = BET_STEPS.findIndex((v) => v >= bet);
  const stepIdx = found === -1 ? BET_STEPS.length - 1 : found;
  const canMinus = stepIdx > 0;
  const canPlus = stepIdx < BET_STEPS.length - 1;
  const canAfford = balance >= cost;

  const nudge = (dir: -1 | 1) => {
    const next = BET_STEPS[stepIdx + dir];
    if (next != null) onBetChange(next);
  };

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
          background:
            "repeating-linear-gradient(135deg, #fff 0 11px, #fda4af 11px 22px, #fb7185 22px 33px, #fff 33px 44px)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute -right-1 -top-1 z-10 grid size-9 place-items-center rounded-full border-2 border-white bg-red-500 text-lg font-black text-white shadow-lg hover:brightness-110"
        >
          ×
        </button>

        <div
          className="relative overflow-hidden rounded-[1.25rem] px-4 pb-5 pt-4"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, #fb7185 0%, #ec4899 45%, #db2777 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 50% 50%, transparent 0 18px, rgba(190,24,93,0.35) 18px 36px)",
            }}
          />

          <div
            className="relative text-center font-black uppercase tracking-wide text-white"
            style={{
              fontSize: "clamp(1.15rem, 4.5vw, 1.45rem)",
              textShadow: "0 3px 0 #1e3a8a, 0 5px 10px rgba(0,0,0,0.35)",
            }}
          >
            Confirm Rebuy
          </div>

          {/* Feature card */}
          <div
            className="relative mt-4 rounded-2xl border-[4px] border-yellow-300 px-3 py-4 text-center"
            style={{
              background: "linear-gradient(180deg, #c0266b 0%, #9d174d 100%)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
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
              className="font-black uppercase tracking-wide text-white"
              style={{
                fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)",
                textShadow: "0 2px 0 #1d4ed8",
              }}
            >
              Buy Feature · {getFreeSpinsBase()} Free Spins
            </div>
            <div
              className="mt-1 font-black tabular-nums leading-none text-yellow-300"
              style={{
                fontSize: "clamp(1.9rem, 8vw, 2.6rem)",
                textShadow: "0 3px 0 #9a3412, 0 6px 10px rgba(0,0,0,0.35)",
                WebkitTextStroke: "1px #b45309",
              }}
            >
              ₱{cost.toFixed(2)}
            </div>
            <div className="mt-2 text-[10px] font-black uppercase leading-snug tracking-wide text-white/95">
              4 candy canes · tumble wins · bomb multipliers in free spins
            </div>
          </div>

          {/* Base bet */}
          <div className="relative mt-5 text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
              Base Bet
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={!canMinus}
                onClick={() => nudge(-1)}
                className="grid size-11 place-items-center rounded-full border-2 border-white/40 bg-[#4c1d95] text-2xl font-black text-white shadow-lg disabled:opacity-40 hover:brightness-110"
              >
                −
              </button>
              <div
                className="min-w-[120px] rounded-xl border-2 border-white/30 px-4 py-2.5 text-center font-black tabular-nums text-yellow-300"
                style={{
                  background: "linear-gradient(180deg, #5b21b6, #3b0764)",
                  fontSize: "1.25rem",
                  textShadow: "0 2px 0 #78350f",
                }}
              >
                ₱{bet.toFixed(2)}
              </div>
              <button
                type="button"
                disabled={!canPlus}
                onClick={() => nudge(1)}
                className="grid size-11 place-items-center rounded-full border-2 border-white/40 bg-[#4c1d95] text-2xl font-black text-white shadow-lg disabled:opacity-40 hover:brightness-110"
              >
                +
              </button>
            </div>
            {!canAfford && (
              <div className="mt-2 text-[11px] font-bold text-yellow-200">
                Insufficient balance
              </div>
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
              Yes
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
