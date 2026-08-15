import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIM } from "./animationConfig";
import { CandyIcon } from "./CandyIcon";
import type { BoardCell } from "./types";

export type ReelPhase = "idle" | "dropping" | "glow" | "popping" | "falling";

type ReelCellProps = {
  index: number;
  cell: BoardCell | null;
  phase: ReelPhase;
  win: boolean;
  perPay?: number;
  isSpawn: boolean;
  isFallen: boolean;
  fallDist: number;
  cols: number;
};

/**
 * Single reel cell — memoized so only cells whose props change re-render
 * during tumble phases (avoids 30× Framer Motion tree work per tick).
 */
export const ReelCell = memo(function ReelCell({
  index,
  cell,
  phase,
  win,
  perPay,
  isSpawn,
  isFallen,
  fallDist,
  cols,
}: ReelCellProps) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const popping = phase === "popping" && win;
  const isInitialDrop = phase === "dropping" && !!cell;
  const isGravityDrop =
    phase === "falling" && !!cell && (isSpawn || isFallen) && fallDist > 0;
  const dropRows = isInitialDrop ? row + 1.35 : fallDist;

  const isScatter = cell?.sym.kind === "scat";

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0",
        phase === "dropping" || phase === "falling" || isScatter
          ? "overflow-visible"
          : "overflow-hidden",
        isScatter
          ? "z-[30]"
          : win && (phase === "glow" || phase === "popping")
            ? "z-[2]"
            : (isInitialDrop || isGravityDrop)
              ? "z-[1]"
              : "",
      )}
    >
      {cell && (
        <motion.div
          key={cell.key}
          className="absolute inset-[3%] flex items-center justify-center will-change-transform"
          initial={
            isInitialDrop || isGravityDrop
              ? {
                  y: `${-dropRows * 100}%`,
                  opacity: isSpawn || isInitialDrop ? 0.55 : 1,
                  scale: isSpawn || isInitialDrop ? 0.92 : 1,
                }
              : false
          }
          animate={
            popping
              ? {
                  scale: [1.08, 1.22, 0],
                  opacity: [1, 1, 0],
                  rotate: [0, -10, 14],
                  y: [0, -8, 12],
                }
              : phase === "glow" && win
                ? {
                    y: 0,
                    opacity: 1,
                    scale: [1, 1.1, 1.06],
                  }
                : {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                  }
          }
          transition={
            popping
              ? {
                  duration: ANIM.popDuration / 1000,
                  delay: (col * 0.55 + row * 0.35) * (ANIM.popStagger / 1000),
                  ease: [0.4, 0, 0.2, 1],
                  times: [0, 0.35, 1],
                }
              : phase === "glow" && win
                ? {
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }
                : isInitialDrop || isGravityDrop
                  ? {
                      y: {
                        type: "spring",
                        stiffness: 420,
                        damping: 26,
                        mass: 0.85,
                        delay:
                          col *
                            ((isInitialDrop
                              ? ANIM.dropStaggerCol
                              : ANIM.fallStaggerCol) /
                              1000) +
                          row *
                            ((isInitialDrop
                              ? ANIM.dropStaggerRow
                              : ANIM.fallStaggerRow) /
                              1000) *
                            0.45,
                      },
                      opacity: {
                        duration: 0.18,
                        delay:
                          col *
                          ((isInitialDrop
                            ? ANIM.dropStaggerCol
                            : ANIM.fallStaggerCol) /
                            1000),
                      },
                      scale: {
                        type: "spring",
                        stiffness: 520,
                        damping: 20,
                        delay:
                          col *
                            ((isInitialDrop
                              ? ANIM.dropStaggerCol
                              : ANIM.fallStaggerCol) /
                              1000) +
                          0.1,
                      },
                    }
                  : {
                      duration: 0.22,
                      ease: [0.22, 1, 0.36, 1],
                    }
          }
        >
          <CandyIcon
            kind={cell.sym.kind}
            mult={cell.mult}
            className={cn(
              "size-full",
              win &&
                (phase === "glow" || phase === "popping") &&
                "drop-shadow-[0_0_14px_rgba(250,204,21,0.9)]",
            )}
          />
          {win &&
            perPay != null &&
            perPay > 0 &&
            (phase === "glow" || phase === "popping") && (
              <motion.span
                initial={{ y: 6, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className="absolute top-0 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-white bg-gradient-to-b from-yellow-200 to-amber-400 px-1 py-0.5 text-[10px] font-black tabular-nums text-amber-950 shadow"
              >
                +₱{Number.isInteger(perPay) ? perPay : perPay.toFixed(2)}
              </motion.span>
            )}
        </motion.div>
      )}
    </div>
  );
});
