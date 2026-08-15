import { memo } from "react";
import { motion } from "framer-motion";

const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const STAR_DELAYS = [0, 0.08, 0.16, 0.24, 0.32, 0.4] as const;

type WinSparklesProps = {
  phase: "idle" | "dropping" | "glow" | "popping" | "falling";
  active: boolean;
};

/**
 * Per-cell win FX — gold ring pulse + radial spark bursts + twinkle stars.
 * Only mounts while a tile is winning (glow / pop).
 */
export const WinSparkles = memo(function WinSparkles({ phase, active }: WinSparklesProps) {
  if (!active) return null;
  const popping = phase === "popping";

  return (
    <div className="pointer-events-none absolute inset-0 z-[40] overflow-visible">
      {/* Soft gold aura behind the tile */}
      <motion.div
        className="absolute inset-[-6%] rounded-xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          popping
            ? { opacity: [0.9, 0], scale: [1.15, 1.55], boxShadow: "0 0 0 0 rgba(250,204,21,0)" }
            : {
                opacity: [0.45, 0.95, 0.45],
                scale: [1, 1.08, 1],
                boxShadow: [
                  "0 0 10px 2px rgba(250,204,21,0.35)",
                  "0 0 22px 6px rgba(250,204,21,0.75)",
                  "0 0 10px 2px rgba(250,204,21,0.35)",
                ],
              }
        }
        transition={
          popping
            ? { duration: 0.35, ease: "easeOut" }
            : { duration: 0.55, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          background:
            "radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(245,158,11,0.2) 45%, transparent 70%)",
          border: "2px solid rgba(253,224,71,0.85)",
        }}
      />

      {/* Shine sweep */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-lg"
        initial={false}
      >
        <motion.div
          className="absolute -inset-y-4 w-[40%] skew-x-[-20deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: popping ? 0.28 : 0.7,
            repeat: popping ? 0 : Infinity,
            ease: "easeInOut",
            repeatDelay: 0.15,
          }}
        />
      </motion.div>

      {/* Radial spark bursts */}
      {SPARK_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = popping ? 58 : 28;
        return (
          <motion.span
            key={`spark-${angle}`}
            className="absolute left-1/2 top-1/2 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FDE047] shadow-[0_0_8px_2px_rgba(250,204,21,0.95)]"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: popping ? [0, 1, 0] : [0.3, 1, 0.3],
              scale: popping ? [0.4, 1.4, 0] : [0.6, 1.15, 0.6],
            }}
            transition={
              popping
                ? {
                    duration: 0.38,
                    delay: i * 0.012,
                    ease: "easeOut",
                  }
                : {
                    duration: 0.65,
                    delay: (i % 4) * 0.05,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        );
      })}

      {/* Twinkle stars around the card */}
      {STAR_DELAYS.map((delay, i) => {
        const positions = [
          { top: "4%", left: "12%" },
          { top: "8%", right: "10%" },
          { bottom: "10%", left: "8%" },
          { bottom: "6%", right: "14%" },
          { top: "42%", left: "-4%" },
          { top: "48%", right: "-4%" },
        ] as const;
        const pos = positions[i];
        return (
          <motion.span
            key={`star-${i}`}
            className="absolute text-[10px] leading-none drop-shadow-[0_0_6px_rgba(250,204,21,1)] sm:text-xs"
            style={pos}
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={
              popping
                ? { opacity: [1, 0], scale: [1.2, 1.8], rotate: 40 }
                : { opacity: [0, 1, 0], scale: [0.4, 1.15, 0.4], rotate: [0, 25, 0] }
            }
            transition={{
              duration: popping ? 0.32 : 0.75,
              delay,
              repeat: popping ? 0 : Infinity,
              ease: "easeInOut",
            }}
          >
            ✦
          </motion.span>
        );
      })}

      {/* Pop burst flash */}
      {popping && (
        <motion.div
          className="absolute inset-[-20%] rounded-full"
          initial={{ opacity: 0.9, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(253,224,71,0.5) 35%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
});
