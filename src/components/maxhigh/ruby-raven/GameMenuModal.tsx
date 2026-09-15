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

/** Compact game menu — turbo, sound, paytable. Theme via CSS vars. */
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
        className="w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border-2 shadow-2xl"
        style={{
          borderColor: "color-mix(in srgb, var(--p-menu-accent) 80%, transparent)",
          background: "linear-gradient(180deg, var(--p-menu-from) 0%, var(--p-menu-to) 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
          <div
            className="text-base font-black uppercase tracking-wide"
            style={{ color: "var(--p-menu-accent)" }}
          >
            Menu
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full border"
            style={{
              borderColor: "color-mix(in srgb, var(--p-menu-accent) 70%, transparent)",
              background: "var(--p-menu-to)",
              color: "var(--p-menu-accent)",
            }}
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
              !turbo && "border-white/20 bg-black/20",
            )}
            style={
              turbo
                ? {
                    borderColor: "var(--p-menu-accent)",
                    background:
                      "linear-gradient(90deg, color-mix(in srgb, var(--p-accent-soft) 25%, transparent), color-mix(in srgb, var(--p-accent) 30%, transparent))",
                  }
                : undefined
            }
          >
            <span className="flex items-center gap-2 text-sm font-black uppercase text-white">
              <Zap size={16} style={{ color: "var(--p-menu-accent)" }} />
              Turbo Spin
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase"
              style={
                turbo
                  ? { background: "var(--p-menu-accent)", color: "var(--p-menu-to)" }
                  : { background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.8)" }
              }
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
                <VolumeX size={16} style={{ color: "var(--p-menu-accent)" }} />
              ) : (
                <Volume2 size={16} style={{ color: "var(--p-menu-accent)" }} />
              )}
              Sound
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase"
              style={
                !muted
                  ? { background: "var(--p-menu-accent)", color: "var(--p-menu-to)" }
                  : { background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.8)" }
              }
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
            <span className="text-[11px] font-bold" style={{ color: "var(--p-menu-accent)" }}>
              Open →
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
