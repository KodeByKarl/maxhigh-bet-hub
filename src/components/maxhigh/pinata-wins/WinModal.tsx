import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PinataWinPopup = {
  title: string;
  amount?: number;
  subtitle?: string;
  /** Visual weight — tally uses the bigger card. */
  tone?: "line" | "gold" | "feature" | "total";
};

type WinModalProps = {
  popup: PinataWinPopup | null;
};

function formatMoney(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Centered win notification modal over the reels (not a thin status strip).
 */
export function WinModal({ popup }: WinModalProps) {
  const tone = popup?.tone ?? "line";
  const isTotal = tone === "total";

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={`${popup.title}-${popup.amount ?? 0}-${popup.subtitle ?? ""}`}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className={cn(
              "relative w-[min(92%,22rem)] overflow-hidden rounded-2xl border-2 text-center shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:w-[min(92%,26rem)] sm:rounded-3xl",
              isTotal
                ? "border-yellow-300 bg-gradient-to-b from-amber-500 via-orange-600 to-rose-800 px-5 py-5 sm:px-7 sm:py-6"
                : tone === "gold"
                  ? "border-yellow-200 bg-gradient-to-b from-yellow-600 via-amber-700 to-amber-950 px-4 py-4 sm:px-6 sm:py-5"
                  : tone === "feature"
                    ? "border-fuchsia-300 bg-gradient-to-b from-fuchsia-600 via-rose-700 to-rose-950 px-4 py-4 sm:px-6 sm:py-5"
                    : "border-amber-200 bg-gradient-to-b from-rose-600 via-orange-700 to-amber-950 px-4 py-4 sm:px-6 sm:py-5",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
            />
            <div className="relative text-[11px] font-black uppercase tracking-[0.22em] text-yellow-100/95 sm:text-xs">
              {popup.title}
            </div>
            {popup.amount != null && popup.amount > 0 && (
              <div
                className={cn(
                  "relative mt-1 font-black tabular-nums text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]",
                  isTotal ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
                )}
              >
                {formatMoney(popup.amount)}
              </div>
            )}
            {popup.subtitle && (
              <div className="relative mt-1.5 text-sm font-bold text-amber-100/90 sm:text-base">
                {popup.subtitle}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
