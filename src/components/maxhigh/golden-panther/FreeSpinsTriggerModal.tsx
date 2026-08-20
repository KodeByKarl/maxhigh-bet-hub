import { motion } from "framer-motion";
import { ICON_SRC } from "./paytable";

type Props = {
  count?: number;
  onClose: () => void;
};

/**
 * Golden Panther — free spins unlock.
 * Temple / gold Aztec theme (not candy-green).
 */
export function FreeSpinsTriggerModal({ count = 10, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] flex cursor-pointer items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      {/* Soft temple glow behind the board */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(217,119,6,0.28) 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, rgba(120,53,15,0.35) 0%, transparent 50%)",
        }}
        aria-hidden
      />

      <motion.div
        initial={{ scale: 0.82, y: 36, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.35rem] sm:max-w-md"
        style={{
          background: "linear-gradient(165deg, #3F2A08 0%, #1A0F05 42%, #0A0704 100%)",
          border: "2px solid #C9A227",
          boxShadow:
            "0 0 0 1px rgba(245,215,110,0.35), 0 24px 60px rgba(0,0,0,0.75), 0 0 48px rgba(217,119,6,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gold rail */}
        <div
          className="h-1.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #8B6914 15%, #F5D76E 50%, #8B6914 85%, transparent 100%)",
          }}
        />

        <div className="relative px-5 pb-6 pt-5 text-center sm:px-7 sm:pt-6">
          {/* Atmosphere pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z' fill='%23F5D76E'/%3E%3C/svg%3E\")",
            }}
            aria-hidden
          />

          <p className="relative text-[10px] font-bold uppercase tracking-[0.38em] text-amber-200/70 sm:text-[11px]">
            Temple Feature
          </p>

          {/* Scatter medallion — lighten blend hides baked black square */}
          <motion.div
            className="relative mx-auto mt-3 flex size-28 items-center justify-center sm:size-32"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <div
              className="pointer-events-none absolute inset-[-18%] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(245,158,11,0.55) 0%, transparent 68%)",
              }}
              aria-hidden
            />
            <img
              src={ICON_SRC.lollipop}
              alt=""
              draggable={false}
              className="relative z-[1] size-[92%] object-contain mix-blend-lighten drop-shadow-[0_0_22px_rgba(245,158,11,0.85)]"
            />
          </motion.div>

          <div
            className="relative mx-auto mt-1 h-px w-24"
            style={{
              background:
                "linear-gradient(90deg, transparent, #F5D76E, transparent)",
            }}
          />

          <h2
            className="relative mt-4 font-black uppercase leading-none tracking-wide text-transparent"
            style={{
              fontSize: "clamp(1.85rem, 7vw, 2.6rem)",
              backgroundImage:
                "linear-gradient(180deg, #FFF6C8 0%, #F5D76E 45%, #D97706 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 3px 0 #451A03)",
            }}
          >
            Free Spins
          </h2>

          <p className="relative mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/75 sm:text-sm">
            {count} panther scatters unlocked
          </p>

          {/* Spin count — primary signal */}
          <div className="relative mx-auto mt-5 max-w-[16rem]">
            <div
              className="rounded-xl border border-amber-300/50 px-4 py-3.5"
              style={{
                background:
                  "linear-gradient(180deg, #92400E 0%, #78350F 55%, #451A03 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,236,179,0.35), 0 10px 28px rgba(0,0,0,0.45)",
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/80">
                Awarded
              </div>
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
                className="mt-0.5 font-black tabular-nums leading-none text-yellow-200"
                style={{
                  fontSize: "clamp(2.4rem, 12vw, 3.4rem)",
                  textShadow: "0 3px 0 #451A03, 0 0 20px rgba(250,204,21,0.55)",
                }}
              >
                {count}
              </motion.div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-amber-100">
                Free Spins
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative mt-5 w-full rounded-lg border border-amber-400/60 bg-gradient-to-b from-amber-500 to-amber-800 py-2.5 text-sm font-black uppercase tracking-wider text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition active:scale-[0.98]"
          >
            Start Spins
          </button>

          <p className="relative mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/45">
            Or tap outside
          </p>
        </div>

        {/* Bottom gold rail */}
        <div
          className="h-1.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #8B6914 15%, #F5D76E 50%, #8B6914 85%, transparent 100%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
