import { motion } from "framer-motion";

export type WinTier = "nice" | "big" | "mega" | "sensational";

const TIER_LABEL: Record<WinTier, string> = {
  nice: "NICE WIN! 🧧",
  big: "GREAT FORTUNE! 🐉",
  mega: "MEGA PROSPERITY! 🧨",
  sensational: "GOLDEN DRAGON BLESSING! 🦁",
};

const LETTER_COLORS = [
  "#facc15",
  "#ef4444",
  "#fbbf24",
  "#f43f5e",
  "#fde047",
  "#dc2626",
  "#f59e0b",
  "#b91c1c",
];

export function winTierFor(amount: number, bet: number): WinTier {
  const x = bet > 0 ? amount / bet : 0;
  if (x >= 50) return "sensational";
  if (x >= 20) return "mega";
  if (x >= 8) return "big";
  return "nice";
}

export type WinCelebrationProps = {
  amount: number;
  bet: number;
  baseEarn?: number | null;
  multiplier?: number | null;
  onDismiss?: () => void;
};

export function WinCelebration({
  amount,
  bet,
  baseEarn,
  multiplier,
  onDismiss,
}: WinCelebrationProps) {
  const tier = winTierFor(amount, bet);
  const label = TIER_LABEL[tier];
  const letters = label.split("");

  const earn = baseEarn != null ? baseEarn : amount;
  const bankedMult = earn > 0 && multiplier != null ? multiplier : 1;
  const appliedMult = Math.max(1, bankedMult);
  const formulaMatches =
    earn > 0 && (appliedMult <= 1 || Math.abs(earn * appliedMult - amount) < 0.02);
  const shownEarn = formulaMatches && appliedMult > 1 ? earn : amount;
  const shownMult = formulaMatches && earn > 0 ? appliedMult : 1;
  const showMultPanel = amount > 0 && (bankedMult > 1 || appliedMult > 1);

  return (
    <motion.button
      type="button"
      aria-label={`Win ₱${amount.toFixed(2)}, dismiss`}
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[4px]"
    >
      {/* Festive Firecracker / Gold Coin Rain */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: tier === "sensational" ? 28 : tier === "mega" ? 20 : 12 }).map((_, i) => (
          <motion.div
            key={`gold-rain-${i}`}
            initial={{
              x: `${(i * 15) % 100}vw`,
              y: "-10vh",
              opacity: 0,
              scale: 0.6 + (i % 3) * 0.3,
            }}
            animate={{
              y: "110vh",
              opacity: [0, 1, 1, 0],
              rotate: 360 * (i % 2 === 0 ? 1 : -1),
            }}
            transition={{
              duration: 2.0 + (i % 4) * 0.4,
              repeat: Infinity,
              delay: (i * 0.1) % 1.5,
              ease: "linear",
            }}
            className="absolute text-yellow-300 text-xl sm:text-3xl drop-shadow-[0_0_12px_rgba(245,158,11,0.95)]"
          >
            {i % 4 === 0 ? "🧧" : i % 4 === 1 ? "🪙" : i % 4 === 2 ? "🧨" : "🦁"}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="relative flex w-full max-w-[460px] flex-col items-center py-4 rounded-3xl border-4 border-yellow-400 bg-gradient-to-b from-red-950 via-red-900 to-black p-6 shadow-[0_0_60px_rgba(239,68,68,0.8)]"
      >
        <div className="mb-1 flex items-end justify-center gap-3">
          {["🏮", "🦁", "🏮"].map((icon, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: i === 1 ? 1.3 : 1, rotate: 0 }}
              transition={{ delay: 0.1 + i * 0.05, type: "spring" }}
              className="text-3xl sm:text-4xl"
            >
              {icon}
            </motion.span>
          ))}
        </div>

        <div className="relative z-[2] mb-3 flex flex-wrap justify-center gap-x-[1px]">
          {letters.map((ch, i) =>
            ch === " " ? (
              <span key={i} className="inline-block w-2.5 sm:w-3.5" />
            ) : (
              <motion.span
                key={`${ch}-${i}`}
                initial={{ y: -28, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.04 + i * 0.03,
                  type: "spring",
                  stiffness: 480,
                }}
                className="inline-block font-black leading-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                style={{
                  fontSize: "clamp(1.75rem, 8vw, 2.8rem)",
                  color: LETTER_COLORS[i % LETTER_COLORS.length],
                  WebkitTextStroke: "1.5px #7f1d1d",
                }}
              >
                {ch}
              </motion.span>
            ),
          )}
        </div>

        {showMultPanel ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: "spring" }}
            className="relative z-[3] mb-3 w-full max-w-[260px] rounded-2xl p-[4px] bg-gradient-to-r from-yellow-300 via-red-500 to-amber-400 shadow-xl"
          >
            <div className="rounded-xl border-2 border-yellow-300 bg-red-950 px-4 py-2.5 text-center">
              <div className="text-[11px] font-black uppercase text-yellow-200">
                Total Multiplier
              </div>
              <div className="mt-0.5 text-3xl sm:text-4xl font-black text-yellow-300 drop-shadow">
                {bankedMult > 0 ? `${bankedMult}x` : "1x"}
              </div>
            </div>
          </motion.div>
        ) : null}

        {showMultPanel && shownMult > 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="relative z-[2] mb-3 w-full max-w-[380px] rounded-2xl border-2 border-yellow-400/60 bg-black/80 p-3"
          >
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1 text-white">
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase text-red-200">Total Earn</div>
                <div className="truncate font-black text-yellow-300 sm:text-lg">
                  ₱{shownEarn.toFixed(2)}
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/70">×</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase text-amber-200">Multiplier</div>
                <div className="font-black text-yellow-300 sm:text-lg">{shownMult}x</div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/70">=</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase text-emerald-200">Total</div>
                <div className="truncate font-black text-yellow-300 sm:text-lg">
                  ₱{amount.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="relative z-[1] w-full px-1">
          <div className="relative mx-auto w-full rounded-full border-4 border-yellow-300 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 px-6 py-4 text-center shadow-2xl">
            <div className="text-[10px] font-black uppercase text-white/90">Total Win</div>
            <motion.div
              key={amount}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: "spring" }}
              className="text-3xl sm:text-5xl font-black text-yellow-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
            >
              ₱{amount.toFixed(2)}
            </motion.div>
          </div>
        </div>

        <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-amber-200">
          Tap to continue
        </div>
      </motion.div>
    </motion.button>
  );
}
