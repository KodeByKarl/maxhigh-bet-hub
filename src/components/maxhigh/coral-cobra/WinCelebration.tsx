import { motion } from "framer-motion";

export type WinTier = "nice" | "big" | "mega" | "sensational";

const TIER_LABEL: Record<WinTier, string> = {
  nice: "NICE!",
  big: "BIG WIN!",
  mega: "MEGA WIN!",
  sensational: "SENSATIONAL!",
};

/** Coral reef letter accents — teal + coral, not candy rainbow. */
const LETTER_COLORS = [
  "#5EEAD4",
  "#FDA4AF",
  "#2DD4BF",
  "#FB7185",
  "#99F6E4",
  "#F472B6",
  "#14B8A6",
  "#FECDD3",
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

/** Coral Cobra win overlay — teal reef + coral rose, theme-aligned. */
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
      {/* Reef spark rain */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: sparkCount }).map((_, i) => (
          <motion.div
            key={`coral-spark-${i}`}
            initial={{
              x: `${(i * 17) % 100}vw`,
              y: "-10vh",
              opacity: 0,
              scale: 0.45 + (i % 3) * 0.25,
            }}
            animate={{
              y: "110vh",
              opacity: [0, 1, 1, 0],
              rotate: 360 * (i % 2 === 0 ? 1 : -1),
            }}
            transition={{
              duration: 1.8 + (i % 4) * 0.3,
              repeat: 1,
              delay: (i * 0.12) % 1.5,
              ease: "linear",
            }}
            className="absolute text-lg sm:text-2xl"
            style={{
              color: i % 2 === 0 ? "#5EEAD4" : "#FDA4AF",
              filter:
                i % 2 === 0
                  ? "drop-shadow(0 0 10px rgba(45,212,191,0.9))"
                  : "drop-shadow(0 0 10px rgba(251,113,133,0.85))",
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
        {/* Coral crest */}
        <div className="mb-2 flex items-end justify-center gap-3">
          {[0.75, 1, 0.75].map((s, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -24 }}
              animate={{
                scale: s,
                rotate: i === 1 ? 0 : i === 0 ? -14 : 14,
              }}
              transition={{ delay: 0.08 + i * 0.05, type: "spring", stiffness: 420 }}
              style={{
                fontSize: i === 1 ? "2.15rem" : "1.35rem",
                color: i === 1 ? "#FDA4AF" : "#5EEAD4",
                filter:
                  i === 1
                    ? "drop-shadow(0 0 12px rgba(251,113,133,0.9))"
                    : "drop-shadow(0 0 10px rgba(45,212,191,0.85))",
              }}
            >
              ◆
            </motion.span>
          ))}
        </div>

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
                  WebkitTextStroke: "0.1em #115E59",
                  paintOrder: "stroke fill",
                  textShadow:
                    "0 0.08em 0 #134E4A, 0 0.16em 0.22em rgba(0,0,0,0.45)",
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
            transition={{ delay: 0.08, type: "spring", stiffness: 380 }}
            className="relative z-[3] mb-3 w-full max-w-[260px] rounded-[1.25rem] p-[5px]"
            style={{
              background:
                "linear-gradient(135deg, #99F6E4 0%, #0D9488 45%, #BE123C 100%)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.65)",
            }}
          >
            <div
              className="rounded-[1rem] border-2 px-4 py-3 text-center"
              style={{
                borderColor: "rgba(153,246,228,0.75)",
                background: "linear-gradient(180deg, #0F766E 0%, #042F2E 100%)",
              }}
            >
              <div
                className="text-[12px] font-black uppercase tracking-wide"
                style={{ color: "#CCFBF1" }}
              >
                Total Multiplier
              </div>
              <div
                className="mt-1 font-black tabular-nums leading-none"
                style={{
                  fontSize: "clamp(2.6rem, 12vw, 3.6rem)",
                  color: "#FDA4AF",
                  textShadow: "0 3px 0 #881337, 0 6px 10px rgba(0,0,0,0.45)",
                  WebkitTextStroke: "1px #9F1239",
                }}
              >
                {bankedMult > 0 ? `${bankedMult}x` : "1x"}
              </div>
              {!formulaMatches && bankedMult > 1 ? (
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-teal-100/85">
                  Peak bomb · applied per tumble
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {showMultPanel && shownMult > 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="relative z-[2] mb-3 w-full max-w-[380px] rounded-2xl border-[3px] px-3 py-3"
            style={{
              borderColor: "rgba(94,234,212,0.55)",
              background:
                "linear-gradient(180deg, rgba(19,78,74,0.96), rgba(4,47,46,0.98))",
              boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
            }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1 text-white">
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-teal-200/90">
                  Total Earn
                </div>
                <div className="truncate font-black tabular-nums text-base text-[#FDA4AF] sm:text-lg">
                  ₱{shownEarn.toFixed(2)}
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-teal-100/60">×</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-rose-200/90">
                  Multiplier
                </div>
                <div className="font-black tabular-nums text-base text-[#5EEAD4] sm:text-lg">
                  {shownMult}x
                </div>
              </div>
              <div className="pb-0.5 text-xl font-black text-teal-100/60">=</div>
              <div className="min-w-0 text-center">
                <div className="text-[8px] font-black uppercase tracking-wider text-teal-100/90">
                  Total
                </div>
                <div className="truncate font-black tabular-nums text-base text-[#FDA4AF] sm:text-lg">
                  ₱{amount.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Total win capsule — coral reef gradient */}
        <div className="relative z-[1] w-full px-1">
          <div
            className="relative mx-auto w-full rounded-full px-6 py-5 sm:px-10 sm:py-6"
            style={{
              background:
                "linear-gradient(180deg, #99F6E4 0%, #2DD4BF 22%, #0D9488 55%, #BE123C 100%)",
              boxShadow:
                "0 10px 32px rgba(13,148,136,0.55), inset 0 3px 10px rgba(255,255,255,0.35), inset 0 -4px 10px rgba(76,5,25,0.35)",
              border: "4px solid rgba(153,246,228,0.75)",
            }}
          >
            <div
              className="relative text-center text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: "rgba(240,253,250,0.92)" }}
            >
              Total Win
            </div>
            <motion.div
              key={amount}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 12 }}
              className="relative text-center font-black tabular-nums leading-none"
              style={{
                fontSize: "clamp(2.25rem, 11vw, 3.75rem)",
                color: "#FFF1F2",
                textShadow: "0 3px 0 #881337, 0 7px 16px rgba(4,47,46,0.55)",
                WebkitTextStroke: "1.5px rgba(19,78,74,0.45)",
              }}
            >
              ₱{amount.toFixed(2)}
            </motion.div>
          </div>
        </div>

        <div
          className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(153,246,228,0.8)" }}
        >
          Tap to continue
        </div>
      </motion.div>
    </motion.button>
  );
}
