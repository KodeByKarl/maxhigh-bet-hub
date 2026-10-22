import { motion } from "framer-motion";

export type WinTier = "nice" | "big" | "mega" | "sensational";

const TIER_LABEL: Record<WinTier, string> = {
  nice: "NICE!",
  big: "BIG WIN!",
  mega: "MEGA WIN!",
  sensational: "SENSATIONAL!",
};

/** Letter accents cycle through the title palette. */
const LETTER_VARS = ["#FFFFFF", "var(--p-accent-soft)", "var(--p-accent)", "var(--p-win-value)"];

function winTierFor(amount: number, bet: number): WinTier {
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

/** Win overlay — tier banner, optional earn × multiplier breakdown, total. */
export function WinCelebration({
  amount,
  bet,
  baseEarn,
  multiplier,
  onDismiss,
}: WinCelebrationProps) {
  const tier = winTierFor(amount, bet);
  const letters = TIER_LABEL[tier].split("");

  const earn = baseEarn != null ? baseEarn : amount;
  const appliedMult = Math.max(1, earn > 0 && multiplier != null ? multiplier : 1);
  const formulaMatches =
    earn > 0 && (appliedMult <= 1 || Math.abs(earn * appliedMult - amount) < 0.02);
  const showMultPanel = amount > 0 && formulaMatches && appliedMult > 1;
  const sparkCount = tier === "sensational" ? 14 : tier === "mega" ? 11 : 8;

  return (
    <motion.button
      type="button"
      aria-label={`Win ₱${amount.toFixed(2)}, dismiss`}
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[3px]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: sparkCount }).map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{
              x: `${(i * 17) % 100}vw`,
              y: "-10vh",
              opacity: 0,
              scale: 0.45 + (i % 3) * 0.25,
            }}
            animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
            transition={{
              duration: 1.8 + (i % 4) * 0.3,
              repeat: 1,
              delay: (i * 0.12) % 1.5,
              ease: "linear",
            }}
            className="absolute text-lg sm:text-2xl"
            style={{
              color: i % 2 === 0 ? "var(--p-accent)" : "var(--p-accent-soft)",
              filter: "drop-shadow(0 0 10px var(--p-spin-shadow))",
            }}
          >
            {i % 3 === 0 ? "✦" : i % 3 === 1 ? "◆" : "✧"}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="relative flex w-full max-w-[440px] flex-col items-center py-4"
      >
        <div
          className="relative z-[2] mb-3 flex flex-wrap justify-center gap-x-[2px]"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          {letters.map((ch, i) =>
            ch === " " ? (
              <span key={i} className="inline-block w-2.5 sm:w-3.5" />
            ) : (
              <motion.span
                key={`${ch}-${i}`}
                initial={{ y: -28, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 + i * 0.03, type: "spring", stiffness: 480, damping: 15 }}
                className="inline-block select-none font-black leading-none"
                style={{
                  fontSize: "clamp(1.85rem, 8.5vw, 3.1rem)",
                  color: LETTER_VARS[i % LETTER_VARS.length],
                  WebkitTextStroke: "0.1em var(--p-accent-deep)",
                  paintOrder: "stroke fill",
                  textShadow: "0 0.08em 0 var(--p-spin-to), 0 0.16em 0.22em rgba(0,0,0,0.45)",
                }}
              >
                {ch}
              </motion.span>
            ),
          )}
        </div>

        {showMultPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="relative z-[2] mb-3 w-full max-w-[380px] rounded-2xl border-[3px] px-3 py-3"
            style={{
              borderColor: "var(--p-rim)",
              background: "linear-gradient(180deg, var(--p-menu-from), var(--p-menu-to))",
              boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1 text-white">
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-white/75">
                  Total Earn
                </div>
                <div
                  className="truncate text-base font-black tabular-nums sm:text-lg"
                  style={{ color: "var(--p-accent-soft)" }}
                >
                  ₱{earn.toFixed(2)}
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/60">×</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-white/75">
                  Multiplier
                </div>
                <div
                  className="text-base font-black tabular-nums sm:text-lg"
                  style={{ color: "var(--p-accent)" }}
                >
                  {appliedMult}x
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/60">=</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-white/75">
                  Total
                </div>
                <div
                  className="truncate text-base font-black tabular-nums sm:text-lg"
                  style={{ color: "var(--p-accent-soft)" }}
                >
                  ₱{amount.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="relative z-[1] w-full px-1">
          <div
            className="relative mx-auto w-full rounded-full px-6 py-5 sm:px-10 sm:py-6"
            style={{
              background:
                "linear-gradient(180deg, #FFFFFF 0%, var(--p-accent-soft) 22%, var(--p-accent) 55%, var(--p-spin-to) 100%)",
              boxShadow:
                "0 10px 32px var(--p-spin-shadow), inset 0 3px 10px rgba(255,255,255,0.45)",
              border: "4px solid rgba(255,255,255,0.8)",
            }}
          >
            <div className="relative text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Total Win
            </div>
            <motion.div
              key={amount}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 12 }}
              className="relative text-center font-black tabular-nums leading-none text-white"
              style={{
                fontSize: "clamp(2.25rem, 11vw, 3.75rem)",
                textShadow: "0 3px 0 var(--p-accent-deep), 0 7px 16px rgba(0,0,0,0.55)",
              }}
            >
              ₱{amount.toFixed(2)}
            </motion.div>
          </div>
        </div>

        <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
          Tap to continue
        </div>
      </motion.div>
    </motion.button>
  );
}
