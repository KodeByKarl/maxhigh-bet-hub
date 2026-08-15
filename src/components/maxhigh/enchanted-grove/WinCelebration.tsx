import { motion } from "framer-motion";

export type WinTier = "nice" | "big" | "mega" | "epic";

const TIER_LABEL: Record<WinTier, string> = {
  nice: "NICE!",
  big: "BIG WIN!",
  mega: "MEGA WIN!",
  epic: "EPIC WIN!",
};

export function winTierFor(amount: number, bet: number): WinTier {
  const x = bet > 0 ? amount / bet : 0;
  if (x >= 50) return "epic";
  if (x >= 30) return "mega";
  if (x >= 15) return "big";
  return "nice";
}

export function WinCelebration({
  amount,
  bet,
  multiplier,
  onDismiss,
}: {
  amount: number;
  bet: number;
  multiplier?: number | null;
  onDismiss?: () => void;
}) {
  const tier = winTierFor(amount, bet);
  const label = TIER_LABEL[tier];
  const mult = Math.max(1, multiplier ?? 1);

  return (
    <motion.button
      type="button"
      aria-label={`Win ${amount.toFixed(2)}, dismiss`}
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-[#1c0a00]/65 p-4 backdrop-blur-[3px]"
    >
      <motion.div
        initial={{ scale: 0.55, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex w-full max-w-[400px] flex-col items-center"
      >
        <div
          className="mb-3 font-black tracking-tight"
          style={{
            fontSize: "clamp(1.8rem, 8vw, 2.8rem)",
            background: "linear-gradient(180deg,#fef3c7,#fbbf24,#d97706)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 3px 0 #451a03)",
          }}
        >
          {label}
        </div>

        {mult > 1 && (
          <div
            className="mb-3 rounded-md border-2 border-amber-200 px-5 py-2 text-center"
            style={{
              background: "linear-gradient(180deg,#92400e,#451a03)",
              boxShadow: "inset 0 1px 0 rgba(253,230,138,0.35)",
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
              Cascade Multiplier
            </div>
            <div className="font-black text-3xl text-amber-300 tabular-nums">{mult}x</div>
          </div>
        )}

        <div
          className="w-full rounded-[1.1rem] p-[3px]"
          style={{
            background:
              "linear-gradient(135deg, #fef3c7 0%, #fbbf24 22%, #b45309 50%, #fde68a 78%, #92400e 100%)",
            boxShadow: "0 16px 40px rgba(69,26,3,0.55)",
          }}
        >
          <div
            className="rounded-[0.95rem] border border-amber-950/70 px-6 py-5 text-center"
            style={{
              background: "linear-gradient(180deg, #a16207 0%, #78350f 30%, #451a03 70%, #1c0a00 100%)",
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
              Total Win
            </div>
            <div
              className="font-black tabular-nums text-amber-100"
              style={{ fontSize: "clamp(2rem,10vw,3.2rem)" }}
            >
              ₱{amount.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
          Tap to continue
        </div>
      </motion.div>
    </motion.button>
  );
}
