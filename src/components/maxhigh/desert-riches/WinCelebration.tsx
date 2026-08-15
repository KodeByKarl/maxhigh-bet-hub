import { AnimatePresence, motion } from "framer-motion";
import { formatMoney } from "@/lib/currency";

type WinCelebrationProps = {
  amount: number | null;
  label?: string | null;
};

/** CNY-style floating win tally over the reels. */
export function WinCelebration({ amount, label }: WinCelebrationProps) {
  return (
    <AnimatePresence>
      {amount != null && amount > 0 && (
        <motion.div
          key={amount}
          className="pointer-events-none absolute inset-x-0 top-[18%] z-40 flex justify-center"
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
        >
          <div className="rounded-2xl border-2 border-yellow-300/90 bg-gradient-to-b from-amber-700/95 via-amber-800/95 to-amber-950/95 px-6 py-3 text-center shadow-[0_0_40px_rgba(180,83,9,0.55)]">
            {label && (
              <div className="text-[11px] font-bold uppercase tracking-widest text-yellow-200/90">
                {label}
              </div>
            )}
            <div className="text-2xl font-black text-yellow-100 drop-shadow sm:text-3xl">
              {formatMoney(amount)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
