import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CnySymKind } from "@/lib/chinese-new-year-config";
import { ChineseIcon } from "./ChineseIcon";
import { ICON_SRC } from "./paytable";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

/** Full-size frames in the spin strip (same visual weight as idle icons). */
const SPIN_STRIP: CnySymKind[] = [
  "lantern",
  "lion",
  "fish",
  "coins",
  "jug",
  "sym_a",
  "sym_k",
  "sym_q",
];
/** Hoisted doubled strip — avoid reallocating every render. */
const SPIN_STRIP_LOOP: CnySymKind[] = [...SPIN_STRIP, ...SPIN_STRIP];
const FRAME_PCT = 100 / SPIN_STRIP_LOOP.length;

type ReelCellProps = {
  kind: CnySymKind;
  phase: ReelPhase;
  reel: number;
  row: number;
  /** Bumps each spin so stop/drop animation remounts. */
  spinId: number;
  winning?: boolean;
  dimmed?: boolean;
  extraLabel?: string | null;
  className?: string;
};

/**
 * Classic vertical reel motion:
 * spinning → full-cell downward scroll (opacity only — no filter blur thrash)
 * stopping → drop-in from above with bounce (staggered per reel)
 */
export const ReelCell = memo(function ReelCell({
  kind,
  phase,
  reel,
  row,
  spinId,
  winning,
  dimmed,
  extraLabel,
  className,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const stopping = phase === "stopping";
  const win = phase === "win" && !!winning;

  const stopDelay = reel * 0.11 + row * 0.035;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[8px]",
        "border border-[#D4AF37]/60 bg-[#2a0c0c]/90",
        "shadow-[inset_0_1px_0_rgba(255,220,120,0.14)]",
        dimmed && !winning && "opacity-35",
        winning &&
          "z-10 border-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.7),inset_0_0_12px_rgba(250,204,21,0.15)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[2px] z-[2] rounded-[6px] border border-yellow-100/10" />
      {winning && (
        <div className="pointer-events-none absolute inset-0 z-[5] rounded-[8px] ring-2 ring-yellow-300/85" />
      )}

      {spinning && (
        <motion.div
          className="absolute left-0 top-0 z-[1] w-full will-change-transform"
          style={{
            height: `${SPIN_STRIP_LOOP.length * 100}%`,
            opacity: 0.88,
          }}
          animate={{ y: ["0%", "-50%"] }}
          transition={{
            duration: 0.2 + (reel % 3) * 0.03,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {SPIN_STRIP_LOOP.map((sym, i) => (
            <div
              key={`spin-${i}`}
              className="relative grid w-full place-items-center overflow-hidden"
              style={{ height: `${FRAME_PCT}%` }}
            >
              <img
                src={ICON_SRC[sym]}
                alt=""
                draggable={false}
                className="pointer-events-none size-[98%] object-contain object-center mix-blend-lighten"
              />
            </div>
          ))}
        </motion.div>
      )}

      {!spinning && (
        <motion.div
          key={stopping ? `land-${spinId}` : "idle"}
          className="absolute inset-0 z-[1] will-change-transform"
          initial={stopping ? { y: "-120%", opacity: 0.35, scale: 0.92 } : false}
          animate={
            win
              ? {
                  y: 0,
                  opacity: 1,
                  scale: [1, 1.06, 1.02],
                }
              : {
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={
            win
              ? { duration: 0.55, repeat: 2, ease: "easeInOut" }
              : stopping
                ? {
                    y: {
                      type: "spring",
                      stiffness: 380,
                      damping: 22,
                      mass: 0.9,
                      delay: stopDelay,
                    },
                    opacity: { duration: 0.15, delay: stopDelay },
                    scale: {
                      type: "spring",
                      stiffness: 460,
                      damping: 18,
                      delay: stopDelay + 0.05,
                    },
                  }
                : { duration: 0.2 }
          }
        >
          <ChineseIcon kind={kind} extraLabel={extraLabel} />
        </motion.div>
      )}

      {spinning && (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45)_0%,transparent_16%,transparent_84%,rgba(0,0,0,0.45)_100%)]" />
      )}
    </div>
  );
});
