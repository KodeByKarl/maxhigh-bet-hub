import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutoSpinOptions = {
  spinCount: number | "infinity";
  spinWithoutReels: boolean;
  stopOnAnyWin: boolean;
  stopOnFreeSpin: boolean;
  singleWinExceeds: number | null;
  balanceIncreaseBy: number | null;
  balanceDecreaseBy: number | null;
};

type Props = {
  bet: number;
  onClose: () => void;
  onStart: (options: AutoSpinOptions) => void;
};

const SPIN_COUNTS: Array<number | "infinity"> = [10, 25, 50, 100, 1000, "infinity"];

export function AutoSpinModal({ bet, onClose, onStart }: Props) {
  const [spinCount, setSpinCount] = useState<number | "infinity">(50);
  const [spinWithoutReels, setSpinWithoutReels] = useState(false);
  const [stopOnAnyWin, setStopOnAnyWin] = useState(false);
  const [stopOnFreeSpin, setStopOnFreeSpin] = useState(true);

  // Sliders state & checkboxes
  const [enableSingleWin, setEnableSingleWin] = useState(false);
  const [singleWinMult, setSingleWinMult] = useState(10); // 10x bet default

  const [enableBalIncrease, setEnableBalIncrease] = useState(false);
  const [balIncreaseMult, setBalIncreaseMult] = useState(50); // 50x bet default

  const [enableBalDecrease, setEnableBalDecrease] = useState(false);
  const [balDecreaseMult, setBalDecreaseMult] = useState(20); // 20x bet default

  const handleStart = () => {
    onStart({
      spinCount,
      spinWithoutReels,
      stopOnAnyWin,
      stopOnFreeSpin,
      singleWinExceeds: enableSingleWin ? +(bet * singleWinMult).toFixed(2) : null,
      balanceIncreaseBy: enableBalIncrease ? +(bet * balIncreaseMult).toFixed(2) : null,
      balanceDecreaseBy: enableBalDecrease ? +(bet * balDecreaseMult).toFixed(2) : null,
    });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Auto Spin Configuration"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        className="relative max-h-[min(92dvh,720px)] w-full max-w-[480px] overflow-hidden rounded-2xl border border-yellow-400/30 bg-[#121212] p-5 shadow-2xl text-white select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative mb-5 flex items-center justify-center">
          <h2 className="text-xl font-black text-white tracking-wide">Auto Spin</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto max-h-[calc(90dvh-130px)] pr-1">
          {/* Number of Spins */}
          <div>
            <div className="mb-2.5 text-center text-xs font-bold uppercase tracking-wider text-white/80">
              Number of Spins
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {SPIN_COUNTS.map((cnt) => {
                const isSelected = spinCount === cnt;
                return (
                  <button
                    key={String(cnt)}
                    type="button"
                    onClick={() => setSpinCount(cnt)}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-lg text-sm font-black transition-all",
                      isSelected
                        ? "bg-[#FDE047] text-black shadow-lg shadow-yellow-500/20"
                        : "bg-[#222] text-white/90 hover:bg-[#2a2a2a]"
                    )}
                  >
                    {cnt === "infinity" ? "∞" : cnt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spin Without Reels */}
          <div
            onClick={() => setSpinWithoutReels((v) => !v)}
            className={cn(
              "cursor-pointer flex items-center gap-3 rounded-full border-2 px-4 py-3 transition-all",
              spinWithoutReels
                ? "border-[#FDE047] bg-[#FDE047]/10"
                : "border-[#FDE047]/60 bg-[#1a1a1a] hover:border-[#FDE047]"
            )}
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FDE047] text-black">
              <Rocket size={20} className="fill-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={spinWithoutReels}
                  onChange={(e) => setSpinWithoutReels(e.target.checked)}
                  className="size-4 rounded accent-[#FDE047] cursor-pointer"
                />
                <span className="text-sm font-black tracking-wide text-[#FDE047] uppercase">
                  SPIN WITHOUT REELS
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                Play all spins with Ultra-Fast Mode without reels.
              </p>
            </div>
          </div>

          {/* Stop Auto Spin Section */}
          <div className="space-y-3.5 pt-1">
            <div className="text-center text-xs font-bold uppercase tracking-wider text-white/80">
              Stop Auto Spin
            </div>

            {/* Checkboxes */}
            <div className="flex items-center justify-center gap-6 text-xs font-bold text-white/90">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnAnyWin}
                  onChange={(e) => setStopOnAnyWin(e.target.checked)}
                  className="size-4 rounded accent-[#FDE047] cursor-pointer"
                />
                <span>On any win</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnFreeSpin}
                  onChange={(e) => setStopOnFreeSpin(e.target.checked)}
                  className="size-4 rounded accent-[#FDE047] cursor-pointer"
                />
                <span>Free spin win</span>
              </label>
            </div>

            {/* Threshold Sliders */}
            <div className="space-y-4 pt-1">
              {/* Single win exceeds */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSingleWin}
                      onChange={(e) => setEnableSingleWin(e.target.checked)}
                      className="size-4 rounded accent-[#FDE047] cursor-pointer"
                    />
                    <span className="text-white/80">If single win exceeds</span>
                  </label>
                  <span className="text-[#FDE047] font-black tabular-nums">
                    {enableSingleWin ? `₱${(bet * singleWinMult).toFixed(2)}` : "None"}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="200"
                  step="2"
                  disabled={!enableSingleWin}
                  value={singleWinMult}
                  onChange={(e) => setSingleWinMult(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#FDE047] disabled:opacity-30"
                />
              </div>

              {/* Balance increase by */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableBalIncrease}
                      onChange={(e) => setEnableBalIncrease(e.target.checked)}
                      className="size-4 rounded accent-[#FDE047] cursor-pointer"
                    />
                    <span className="text-white/80">If balance increase by</span>
                  </label>
                  <span className="text-[#FDE047] font-black tabular-nums">
                    {enableBalIncrease ? `₱${(bet * balIncreaseMult).toFixed(2)}` : "None"}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  disabled={!enableBalIncrease}
                  value={balIncreaseMult}
                  onChange={(e) => setBalIncreaseMult(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#FDE047] disabled:opacity-30"
                />
              </div>

              {/* Balance decrease by */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableBalDecrease}
                      onChange={(e) => setEnableBalDecrease(e.target.checked)}
                      className="size-4 rounded accent-[#FDE047] cursor-pointer"
                    />
                    <span className="text-white/80">If balance decrease by</span>
                  </label>
                  <span className="text-[#FDE047] font-black tabular-nums">
                    {enableBalDecrease ? `₱${(bet * balDecreaseMult).toFixed(2)}` : "None"}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  disabled={!enableBalDecrease}
                  value={balDecreaseMult}
                  onChange={(e) => setBalDecreaseMult(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#FDE047] disabled:opacity-30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-3 pt-4 mt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#333] hover:bg-[#3a3a3a] text-white font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 h-11 rounded-lg bg-[#FDE047] hover:bg-[#facc15] text-black font-black text-base shadow-lg shadow-yellow-500/20 transition"
          >
            Start
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
