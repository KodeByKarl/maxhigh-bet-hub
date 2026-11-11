import { motion } from "framer-motion";
import { ICON_SRC } from "./paytable";

type Props = {
  count?: number;
  onClose: () => void;
};

/**
 * Buffalo Reign — free spins unlock.
 * Colors come from panther theme CSS variables on the slot root.
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--p-accent) 28%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, color-mix(in srgb, var(--p-accent-deep) 35%, transparent) 0%, transparent 50%)",
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
          background: "linear-gradient(165deg, #4a2f19 0%, #2b1a0e 45%, #140b05 100%)",
          border: "2px solid #e0a447",
          boxShadow:
            "0 0 0 1px color-mix(in srgb, var(--p-accent-soft) 35%, transparent), 0 24px 60px rgba(0,0,0,0.75), 0 0 48px var(--p-spin-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-1.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--p-accent-deep) 15%, var(--p-menu-accent) 50%, var(--p-accent-deep) 85%, transparent 100%)",
          }}
        />

        <div className="relative px-5 pb-6 pt-5 text-center sm:px-7 sm:pt-6">
          <p
            className="relative text-[10px] font-bold uppercase tracking-[0.38em] sm:text-[11px]"
            style={{ color: "color-mix(in srgb, var(--p-accent-soft) 70%, transparent)" }}
          >
            Bonus Unlocked
          </p>

          <motion.div
            className="relative mx-auto mt-3 flex size-28 items-center justify-center sm:size-32"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <div
              className="pointer-events-none absolute inset-[-18%] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--p-accent) 55%, transparent) 0%, transparent 68%)",
              }}
              aria-hidden
            />
            <img
              src={ICON_SRC.lollipop}
              alt=""
              draggable={false}
              className="relative z-[1] size-[92%] object-contain"
              style={{ filter: "drop-shadow(0 0 22px var(--p-accent))" }}
            />
          </motion.div>

          <div
            className="relative mx-auto mt-1 h-px w-24"
            style={{
              background: "linear-gradient(90deg, transparent, var(--p-menu-accent), transparent)",
            }}
          />

          <h2
            className="relative mt-4 font-black uppercase leading-none tracking-wide text-transparent"
            style={{
              fontSize: "clamp(1.85rem, 7vw, 2.6rem)",
              backgroundImage:
                "linear-gradient(180deg, var(--p-accent-soft) 0%, var(--p-menu-accent) 45%, var(--p-accent) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 3px 0 var(--p-accent-deep))",
            }}
          >
            Free Spins
          </h2>

          <p
            className="relative mt-2 text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm"
            style={{ color: "color-mix(in srgb, var(--p-hud-value) 75%, transparent)" }}
          >
            The gold rush begins
          </p>

          <div className="relative mx-auto mt-5 max-w-[16rem]">
            <div
              className="rounded-xl border px-4 py-3.5"
              style={{
                borderColor: "color-mix(in srgb, var(--p-accent-soft) 50%, transparent)",
                background: "linear-gradient(180deg, #c58a1f 0%, #5e380c 55%, #2b1a0e 100%)",
                boxShadow:
                  "inset 0 1px 0 color-mix(in srgb, var(--p-accent-soft) 35%, transparent), 0 10px 28px rgba(0,0,0,0.45)",
              }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-[0.28em]"
                style={{ color: "color-mix(in srgb, var(--p-accent-soft) 80%, transparent)" }}
              >
                Awarded
              </div>
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
                className="mt-0.5 font-black tabular-nums leading-none"
                style={{
                  fontSize: "clamp(2.4rem, 12vw, 3.4rem)",
                  color: "var(--p-win-value)",
                  textShadow: "0 3px 0 var(--p-accent-deep), 0 0 20px var(--p-spin-shadow)",
                }}
              >
                {count}
              </motion.div>
              <div
                className="mt-1 text-sm font-black uppercase tracking-[0.18em]"
                style={{ color: "var(--p-hud-value)" }}
              >
                Free Spins
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative mt-5 w-full rounded-lg border py-2.5 text-sm font-black uppercase tracking-wider transition active:scale-[0.98]"
            style={{
              borderColor: "color-mix(in srgb, var(--p-accent) 60%, transparent)",
              background: "linear-gradient(180deg, #f6c65b 0%, #c58a1f 70%, #a8691f 100%)",
              color: "#2a1706",
              boxShadow: "0 0 20px rgba(246,198,91,0.45)",
            }}
          >
            Start Spins
          </button>

          <p
            className="relative mt-3 text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "color-mix(in srgb, var(--p-accent-soft) 45%, transparent)" }}
          >
            Or tap outside
          </p>
        </div>

        <div
          className="h-1.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--p-accent-deep) 15%, var(--p-menu-accent) 50%, var(--p-accent-deep) 85%, transparent 100%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
