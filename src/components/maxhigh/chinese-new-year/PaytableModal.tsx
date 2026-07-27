import { motion } from "framer-motion";
import { X } from "lucide-react";
import { SYMBOLS, payForCount } from "./paytable";
import { ChineseIcon } from "./ChineseIcon";

export function PaytableModal({
  bet,
  onClose,
}: {
  bet: number;
  onClose: () => void;
}) {
  const payables = SYMBOLS.filter((s) => !s.scatter && !s.bomb);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border-4 border-yellow-500 bg-gradient-to-b from-red-950 via-red-900 to-black p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-yellow-500/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏮</span>
            <h2 className="text-xl font-black uppercase text-yellow-300">
              Chinese New Year Paytable
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-red-900 text-yellow-300 hover:bg-red-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="rounded-xl border border-yellow-500/30 bg-black/50 p-3 text-xs text-amber-200">
            Matching 8 or more identical Zodiac symbols anywhere on the 46-slot grid triggers a tumble win!
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {payables.map((sym) => (
              <div
                key={sym.id}
                className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-black/60 p-3"
              >
                <div className="size-12 shrink-0">
                  <ChineseIcon kind={sym.kind} />
                </div>
                <div className="flex flex-col text-xs font-bold text-yellow-200">
                  <span>8–9: ₱{(bet * payForCount(sym, 8)).toFixed(2)}</span>
                  <span>10–11: ₱{(bet * payForCount(sym, 10)).toFixed(2)}</span>
                  <span>12+: ₱{(bet * payForCount(sym, 12)).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
