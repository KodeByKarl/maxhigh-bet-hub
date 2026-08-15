import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "./animationConfig";

type Props = {
  spins: number;
  onDone?: () => void;
};

/** Temple-doors free-spin intro — replaces an abrupt banner cut. */
export function FreeSpinIntro({ spins, onDone }: Props) {
  return (
    <motion.button
      key="fs-intro"
      type="button"
      aria-label="Continue free spins"
      className="absolute inset-0 z-[45] flex items-center justify-center bg-gradient-to-b from-amber-950/90 via-stone-950/85 to-amber-950/90 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.4 }}
      onClick={onDone}
    >
      <motion.div
        className="relative flex flex-col items-center gap-3 px-6 text-center"
        initial={{ scale: 0.72, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE.bounceLand }}
      >
        <motion.div
          className="absolute inset-[-40%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 65%)",
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0.55], scale: [0.6, 1.15, 1] }}
          transition={{ duration: 0.9, ease: EASE.reelStop }}
        />
        <div
          className="relative font-black uppercase tracking-[0.28em] text-amber-200/90 text-[11px] sm:text-xs"
          style={{ textShadow: "0 0 12px rgba(251,191,36,0.5)" }}
        >
          Temple Gates Open
        </div>
        <div
          className="relative font-black leading-none text-[clamp(2.4rem,8vw,4.2rem)] text-amber-100"
          style={{
            textShadow:
              "0 2px 0 #78350f, 0 4px 0 #451a03, 0 0 28px rgba(251,191,36,0.85)",
          }}
        >
          {spins}
        </div>
        <div
          className="relative font-black uppercase tracking-[0.22em] text-amber-300 text-lg sm:text-xl"
          style={{ textShadow: "0 0 16px rgba(251,191,36,0.65)" }}
        >
          Free Spins
        </div>
        <motion.div
          className="relative mt-2 h-[3px] w-40 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: EASE.softOut }}
        />
      </motion.div>
    </motion.button>
  );
}

type GatherProps = {
  /** Screen-space centers of scatter symbols relative to the grid. */
  points: { x: number; y: number; key: string }[];
  gridW: number;
  gridH: number;
};

/** Scatter symbols fly toward center with scale-up + glow before FS intro. */
export function ScatterGatherOverlay({ points, gridW, gridH }: GatherProps) {
  const cx = gridW / 2;
  const cy = gridH / 2;
  return (
    <div className="pointer-events-none absolute inset-0 z-[40] overflow-visible">
      <AnimatePresence>
        {points.map((p, i) => (
          <motion.div
            key={p.key}
            className="absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              boxShadow: "0 0 28px 8px rgba(251,191,36,0.75)",
              background:
                "radial-gradient(circle, rgba(254,243,199,0.95) 0%, rgba(245,158,11,0.55) 45%, transparent 70%)",
            }}
            initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            animate={{
              x: cx - p.x,
              y: cy - p.y,
              scale: [1, 1.35, 1.55],
              opacity: [1, 1, 0.85],
            }}
            exit={{ scale: 2.2, opacity: 0 }}
            transition={{
              duration: 0.65,
              delay: i * 0.04,
              ease: EASE.reelStop,
            }}
          />
        ))}
      </AnimatePresence>
      <motion.div
        className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(253,224,71,0.9) 0%, rgba(245,158,11,0.4) 40%, transparent 70%)",
          boxShadow: "0 0 40px 12px rgba(251,191,36,0.65)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1.1], opacity: [0, 1, 0.7] }}
        transition={{ duration: 0.55, delay: 0.35, ease: EASE.bounceLand }}
      />
    </div>
  );
}
