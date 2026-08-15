import { motion } from "framer-motion";

export type WinTier = "nice" | "big" | "mega" | "sensational";

const TIER_LABEL: Record<WinTier, string> = {
  nice: "NICE!",
  big: "BIG WIN!",
  mega: "MEGA WIN!",
  sensational: "SENSATIONAL!",
};

const LETTER_COLORS = [
  "#ff4dc8",
  "#ffd60a",
  "#c44dff",
  "#3dff8a",
  "#3de8ff",
  "#ff6b9d",
  "#ffe566",
  "#b388ff",
  "#69f0ae",
  "#80d8ff",
  "#ff8a65",
  "#f48fb1",
];

/** Pick celebration tier from win / bet ratio. */
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

/** Win popup — always shows Total Multiplier + earn × mult = total. */
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
  // Collected bombs can be 0 during FS; payout math uses max(1, mult)
  // Invalid / orphan mult with ₱0 earn must not display as a real multiplier.
  const bankedMult = earn > 0 && multiplier != null ? multiplier : 1;
  const appliedMult = Math.max(1, bankedMult);
  // Peak bomb ≠ always earn×mult (bombs apply per tumble). Only show formula when it matches.
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
      className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[3px]"
    >
      {/* Golden Particle Rain / Burst Effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: tier === "sensational" ? 24 : tier === "mega" ? 18 : 12 }).map((_, i) => (
          <motion.div
            key={`gold-particle-${i}`}
            initial={{
              x: `${(i * 17) % 100}vw`,
              y: "-10vh",
              opacity: 0,
              scale: 0.5 + (i % 3) * 0.3,
            }}
            animate={{
              y: "110vh",
              opacity: [0, 1, 1, 0],
              rotate: 360 * (i % 2 === 0 ? 1 : -1),
            }}
            transition={{
              duration: 2.2 + (i % 4) * 0.4,
              repeat: Infinity,
              delay: (i * 0.12) % 1.5,
              ease: "linear",
            }}
            className="absolute text-yellow-300 text-lg sm:text-2xl drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
          >
            {i % 3 === 0 ? "🪙" : i % 3 === 1 ? "✨" : "💎"}
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
        <div className="mb-1 flex items-end justify-center gap-4">
          {[0.7, 1, 0.7].map((s, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{
                scale: s,
                rotate: i === 1 ? 0 : i === 0 ? -16 : 16,
              }}
              transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 420 }}
              style={{
                fontSize: i === 1 ? "2.4rem" : "1.45rem",
                color: "#fde047",
                filter: "drop-shadow(0 0 10px rgba(250,204,21,0.95))",
                textShadow: "0 2px 0 #a16207",
              }}
            >
              ★
            </motion.span>
          ))}
        </div>

        <div
          className="relative z-[2] mb-3 flex flex-wrap justify-center gap-x-[1px]"
          style={{ transform: "rotate(-2deg)" }}
        >
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
                  damping: 15,
                }}
                className="inline-block font-black leading-none select-none"
                style={{
                  fontSize: "clamp(1.85rem, 8.5vw, 3.1rem)",
                  color: LETTER_COLORS[i % LETTER_COLORS.length],
                  WebkitTextStroke: "0.12em #dc2626",
                  paintOrder: "stroke fill",
                  textShadow:
                    "0 0.08em 0 #9f1239, 0 0.18em 0.2em rgba(0,0,0,0.4)",
                }}
              >
                {ch}
              </motion.span>
            ),
          )}
        </div>

        {/* Total Multiplier — only when there was a real earn */}
        {showMultPanel ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 380 }}
            className="relative z-[3] mb-3 w-full max-w-[260px] rounded-[1.25rem] p-[5px]"
            style={{
              background:
                "linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #064E3B 100%)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.65)",
            }}
          >
            <div
              className="rounded-[1rem] border-2 border-amber-300/80 px-4 py-3 text-center"
              style={{
                background:
                  "linear-gradient(180deg, #064E3B 0%, #022014 100%)",
              }}
            >
              <div
                className="text-[12px] font-black uppercase tracking-wide text-white"
                style={{
                  textShadow:
                    "0 1px 0 #0c4a6e, 0 -1px 0 #0c4a6e, 1px 0 0 #0c4a6e, -1px 0 0 #0c4a6e",
                }}
              >
                Total Multiplier
              </div>
              <div
                className="mt-1 font-black tabular-nums leading-none text-yellow-300"
                style={{
                  fontSize: "clamp(2.6rem, 12vw, 3.6rem)",
                  textShadow: "0 3px 0 #78350f, 0 6px 10px rgba(0,0,0,0.45)",
                  WebkitTextStroke: "1px #92400e",
                }}
              >
                {bankedMult > 0 ? `${bankedMult}x` : "1x"}
              </div>
              {!formulaMatches && bankedMult > 1 ? (
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/85">
                  Peak bomb · applied per tumble
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {/* Total Earn × Multiplier = Total */}
        {showMultPanel && shownMult > 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="relative z-[2] mb-3 w-full max-w-[380px] rounded-2xl border-[3px] border-white/50 px-3 py-3"
            style={{
              background:
                "linear-gradient(180deg, rgba(88,28,135,0.95), rgba(49,16,89,0.96))",
              boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1 text-white">
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-pink-200">
                  Total Earn
                </div>
                <div className="truncate font-black tabular-nums text-base text-yellow-300 sm:text-lg">
                  ₱{shownEarn.toFixed(2)}
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/70">×</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-sky-200">
                  Multiplier
                </div>
                <div className="font-black tabular-nums text-base text-yellow-300 sm:text-lg">
                  {shownMult}x
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-white/70">=</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-emerald-200">
                  Total
                </div>
                <div className="truncate font-black tabular-nums text-base text-yellow-300 sm:text-lg">
                  ₱{amount.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Final total panther capsule */}
        <div className="relative z-[1] w-full px-1">
          <div
            className="relative mx-auto w-full rounded-full px-6 py-5 sm:px-10 sm:py-6"
            style={{
              background:
                "linear-gradient(180deg, #fda4af 0%, #fb7185 28%, #f472b6 55%, #ec4899 78%, #db2777 100%)",
              boxShadow:
                "0 10px 32px rgba(219,39,119,0.55), inset 0 3px 10px rgba(255,255,255,0.55), inset 0 -4px 10px rgba(157,23,77,0.35)",
              border: "4px solid rgba(255,255,255,0.75)",
            }}
          >
            <div className="relative text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
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
                textShadow:
                  "0 3px 0 #7e22ce, 0 7px 16px rgba(88,28,135,0.5)",
                WebkitTextStroke: "1.5px rgba(126,34,206,0.4)",
              }}
            >
              ₱{amount.toFixed(2)}
            </motion.div>
          </div>
        </div>

        <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
          Tap to continue
        </div>
      </motion.div>
    </motion.button>
  );
}
