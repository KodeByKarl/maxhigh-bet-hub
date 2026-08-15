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
            "repeating-linear-gradient(135deg, #fff 0 12px, #fda4af 12px 24px, #fb7185 24px 36px, #fff 36px 48px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
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
              "radial-gradient(circle at 50% 0%, #a855f7 0%, #7e22ce 40%, #4c1d95 100%)",
            boxShadow: "inset 0 0 40px rgba(255,255,255,0.12)",
          }}
        >
          {/* Bubble texture */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.35rem] opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          <div
            className="relative font-black uppercase tracking-wide text-yellow-300"
            style={{
              fontSize: "clamp(1.35rem, 5.5vw, 1.85rem)",
              textShadow: "0 3px 0 #6b21a8, 0 6px 12px rgba(0,0,0,0.4)",
              WebkitTextStroke: "1px #581c87",
            }}
          >
            Congratulations
          </div>

          <div
            className="relative mt-1 font-black uppercase tracking-[0.12em] text-white"
            style={{
              fontSize: "clamp(0.95rem, 3.8vw, 1.2rem)",
              WebkitTextStroke: "1.5px #2563eb",
              paintOrder: "stroke fill",
              textShadow: "0 2px 6px rgba(0,0,0,0.35)",
            }}
          >
            You Have Won
          </div>

          {/* Amount pill — wide + fluid type so big totals never clip */}
          <div className="relative mx-auto mt-5 w-full px-1">
            <div
              className="pointer-events-none absolute -left-1 top-1/2 size-7 -translate-y-1/2 rounded-full sm:-left-2 sm:size-9"
              style={{ background: "#f472b6", boxShadow: "0 0 14px #f472b6" }}
            />
            <div
              className="pointer-events-none absolute -right-1 top-1/2 size-7 -translate-y-1/2 rounded-full sm:-right-2 sm:size-9"
              style={{ background: "#f472b6", boxShadow: "0 0 14px #f472b6" }}
            />
            <div
              className="relative w-full rounded-full border-4 border-white/80 px-4 py-3.5 sm:px-8 sm:py-4"
              style={{
                background:
                  "linear-gradient(180deg, #fda4af 0%, #f472b6 45%, #db2777 100%)",
                boxShadow:
                  "0 8px 24px rgba(190,24,93,0.55), inset 0 3px 10px rgba(255,255,255,0.45)",
              }}
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
                className="w-full whitespace-nowrap text-center font-black tabular-nums leading-none"
                style={{
                  fontSize: amountFont,
                  background: "linear-gradient(180deg,#fff 10%,#fde047 55%,#fb923c 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 3px 0 #7e22ce)",
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
