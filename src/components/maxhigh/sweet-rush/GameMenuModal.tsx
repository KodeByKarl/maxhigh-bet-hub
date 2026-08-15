import { motion } from "framer-motion";
import { Volume2, VolumeX, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  turbo: boolean;
  muted: boolean;
  onTurboChange: (on: boolean) => void;
  onMutedChange: (on: boolean) => void;
  onOpenPaytable: () => void;
  onClose: () => void;
};

/** Compact game menu — turbo, sound, paytable. */
export function GameMenuModal({
  turbo,
  muted,
  onTurboChange,
  onMutedChange,
  onOpenPaytable,
  onClose,
}: Props) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Game menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
        className="w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border-2 border-[#E8C547]/80 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #6D28D9 0%, #3B0764 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
          <div className="text-base font-black uppercase tracking-wide text-[#F5D76E]">
            Menu
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full border border-[#E8C547]/70 bg-[#3B0764] text-[#F5D76E]"
            aria-label="Close menu"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <button
            type="button"
            onClick={() => onTurboChange(!turbo)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-left transition",
              turbo
                ? "border-[#E8C547] bg-gradient-to-r from-[#FFF3B0]/25 to-[#D4A017]/30"
                : "border-white/20 bg-black/20",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-black uppercase text-white">
              <Zap size={16} className="text-[#F5D76E]" />
              Turbo Spin
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase",
                turbo ? "bg-[#F5D76E] text-[#3B0764]" : "bg-black/35 text-white/80",
              )}
            >
              {turbo ? "On" : "Off"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onMutedChange(!muted)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-white/20 bg-black/20 px-3 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-black uppercase text-white">
              {muted ? (
                <VolumeX size={16} className="text-[#F5D76E]" />
              ) : (
                <Volume2 size={16} className="text-[#F5D76E]" />
              )}
              Sound
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase",
                !muted ? "bg-[#F5D76E] text-[#3B0764]" : "bg-black/35 text-white/80",
              )}
            >
              {muted ? "Off" : "On"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPaytable();
            }}
            className="flex w-full items-center justify-between rounded-xl border-2 border-white/20 bg-black/20 px-3 py-3 text-left"
          >
            <span className="text-sm font-black uppercase text-white">Paytable</span>
            <span className="text-[11px] font-bold text-[#F5D76E]">Open →</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
