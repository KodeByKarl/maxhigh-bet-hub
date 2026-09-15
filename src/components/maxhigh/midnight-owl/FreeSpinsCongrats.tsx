import { motion } from "framer-motion";

export type FreeSpinsCongratsProps = {
  amount: number;
  spinsPlayed: number;
  baseEarn: number;
  multiplier: number;
  onContinue: () => void;
};

/** Post free-spins summary — tap anywhere to continue (no auto-dismiss). */
export function FreeSpinsCongrats({
  amount,
  spinsPlayed,
  baseEarn,
  multiplier,
  onContinue,
}: FreeSpinsCongratsProps) {
  const appliedMult = Math.max(1, multiplier);
  const digits = amount.toFixed(2).length;
  const amountFont =
    digits >= 11
      ? "clamp(1.15rem, 5.5vw, 1.85rem)"
      : digits >= 9
        ? "clamp(1.45rem, 6.5vw, 2.35rem)"
        : "clamp(1.85rem, 8vw, 3rem)";

  return (
    <motion.button
      type="button"
      aria-label="Free spins complete, press to continue"
      onClick={onContinue}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/55 p-3 backdrop-blur-[3px]"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="relative w-full max-w-[560px] rounded-[1.75rem] p-[10px]"
        style={{
          background:
            "linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #064E3B 100%)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
        }}
      >
        {/* Corner stars */}
        {(["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"] as const).map(
          (pos) => (
            <span
              key={pos}
              className={`pointer-events-none absolute z-[2] text-yellow-300 ${pos}`}
              style={{
                fontSize: "1.1rem",
                filter: "drop-shadow(0 0 6px rgba(250,204,21,0.9))",
              }}
            >
              ★
            </span>
          ),
        )}

        <div
          className="relative overflow-visible rounded-[1.35rem] px-4 py-7 text-center sm:px-6"
          style={{
            background:
              "linear-gradient(180deg, #064E3B 0%, #022014 100%)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="relative font-black uppercase tracking-wide text-yellow-300"
            style={{
              fontSize: "clamp(1.35rem, 5.5vw, 1.85rem)",
              textShadow: "0 3px 0 #78350F, 0 6px 12px rgba(0,0,0,0.6)",
            }}
          >
            Congratulations
          </div>

          <div
            className="relative mt-1 font-black uppercase tracking-[0.12em] text-emerald-200"
            style={{
              fontSize: "clamp(0.95rem, 3.8vw, 1.2rem)",
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            You Have Won
          </div>

          {/* Amount pill — wide + fluid type so big totals never clip */}
          <div className="relative mx-auto mt-5 w-full px-1">
            <div
              className="relative w-full rounded-full border-2 border-amber-300 px-4 py-3.5 sm:px-8 sm:py-4 shadow-xl"
              style={{
                background:
                  "linear-gradient(180deg, #D97706 0%, #78350F 100%)",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.6), inset 0 3px 10px rgba(255,255,255,0.25)",
              }}
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
                className="w-full whitespace-nowrap text-center font-black tabular-nums leading-none text-yellow-300"
                style={{
                  fontSize: amountFont,
                  textShadow: "0 3px 0 #451A03, 0 0 15px rgba(250,204,21,0.8)",
                }}
              >
                ₱{amount.toFixed(2)}
              </motion.div>
            </div>
          </div>

          {/* Earn × Mult breakdown — only when there was a real earn + valid mult */}
          {baseEarn > 0 && appliedMult > 1 ? (
            <div className="relative mx-auto mt-4 w-full max-w-[480px] rounded-xl border border-white/25 bg-black/25 px-3 py-2">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-black tabular-nums text-white/95 sm:text-[12px]">
                <span className="text-yellow-300">₱{baseEarn.toFixed(2)}</span>
                <span className="text-white/60">×</span>
                <span className="text-sky-300">{appliedMult}x</span>
                <span className="text-white/60">=</span>
                <span className="text-yellow-300">₱{amount.toFixed(2)}</span>
              </div>
            </div>
          ) : null}

          <div className="relative mt-5 font-black uppercase tracking-wide">
            <span
              className="text-white"
              style={{
                fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)",
                WebkitTextStroke: "1.5px #2563eb",
                paintOrder: "stroke fill",
              }}
            >
              In{" "}
            </span>
            <span
              className="text-yellow-300"
              style={{
                fontSize: "clamp(1.25rem, 5vw, 1.65rem)",
                textShadow: "0 2px 0 #6b21a8",
              }}
            >
              {spinsPlayed}
            </span>
            <span
              className="text-white"
              style={{
                fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)",
                WebkitTextStroke: "1.5px #2563eb",
                paintOrder: "stroke fill",
              }}
            >
              {" "}
              Free Spins
            </span>
          </div>

          <div className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
            Press Anywhere To Continue
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}
