import { memo } from "react";
import { motion } from "framer-motion";

type WinSparklesProps = {
  /** When true, play a one-shot pop burst instead of idle glow. */
  popping?: boolean;
  active: boolean;
};

/**
 * Lightweight win FX — transform/opacity only (no animated filter/boxShadow).
 * Capped to a few motion nodes so many winners don't storm the compositor.
 */
export const WinSparkles = memo(function WinSparkles({
  popping = false,
  active,
}: WinSparklesProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[40] overflow-visible">
      {/* Soft gold aura — static shadow, animate opacity/scale only */}
      <motion.div
        className="absolute inset-[-6%] rounded-xl border-2 border-[rgba(253,224,71,0.85)] shadow-[0_0_16px_4px_rgba(250,204,21,0.55)]"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          popping
            ? { opacity: [0.9, 0], scale: [1.15, 1.45] }
            : { opacity: [0.45, 0.9, 0.45], scale: [1, 1.06, 1] }
        }
        transition={
          popping
            ? { duration: 0.32, ease: "easeOut" }
            : { duration: 0.55, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          background:
            "radial-gradient(circle, rgba(253,224,71,0.5) 0%, rgba(245,158,11,0.15) 45%, transparent 70%)",
        }}
      />

      {/* Shine sweep */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <motion.div
          className="absolute -inset-y-4 w-[40%] skew-x-[-20deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: popping ? 0.28 : 0.7,
            repeat: popping ? 0 : Infinity,
            ease: "easeInOut",
            repeatDelay: 0.2,
          }}
        />
      </div>

      {/* Cap sparks at 4 (was 8) */}
      {([0, 90, 180, 270] as const).map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = popping ? 52 : 26;
        return (
          <motion.span
            key={`spark-${angle}`}
            className="absolute left-1/2 top-1/2 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FDE047]"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: popping ? [0, 1, 0] : [0.35, 1, 0.35],
              scale: popping ? [0.4, 1.3, 0] : [0.65, 1.1, 0.65],
            }}
            transition={
              popping
                ? { duration: 0.35, delay: i * 0.02, ease: "easeOut" }
                : {
                    duration: 0.65,
                    delay: i * 0.06,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        );
      })}

      {/* Cap stars at 2 (was 6) */}
      {(
        [
          { top: "6%", left: "10%" },
          { bottom: "8%", right: "12%" },
        ] as const
      ).map((pos, i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute text-[10px] leading-none text-[#FDE047] sm:text-xs"
          style={pos}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            popping
              ? { opacity: [1, 0], scale: [1.2, 1.6] }
              : { opacity: [0, 1, 0], scale: [0.5, 1.1, 0.5] }
          }
          transition={{
            duration: popping ? 0.3 : 0.75,
            delay: i * 0.12,
            repeat: popping ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          ✦
        </motion.span>
      ))}

      {popping && (
        <motion.div
          className="absolute inset-[-20%] rounded-full"
          initial={{ opacity: 0.85, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.7 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(253,224,71,0.4) 35%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
});
