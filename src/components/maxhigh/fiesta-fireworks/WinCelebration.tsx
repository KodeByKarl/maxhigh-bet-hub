import { AnimatePresence, motion } from "framer-motion";
import { formatMoney } from "@/lib/currency";

type WinCelebrationProps = {
  amount: number | null;
  label?: string | null;
};

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
          <div className="rounded-2xl border-2 border-yellow-300/90 bg-gradient-to-b from-red-800/95 via-amber-800/95 to-red-950/95 px-6 py-3 text-center shadow-[0_0_40px_rgba(220,38,38,0.55)]">
            {label && (
              <div className="text-[11px] font-bold uppercase tracking-widest text-yellow-200/90">
                {label}
              </div>
            )}
            <div className="font-black text-2xl sm:text-3xl text-yellow-100 drop-shadow">
              {formatMoney(amount)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
