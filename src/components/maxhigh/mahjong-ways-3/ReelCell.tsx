import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIM } from "./animationConfig";
import { Mahjong3Icon } from "./Mahjong3Icon";
import { WinSparkles } from "./WinSparkles";
import type { BoardCell } from "./types";

export type ReelPhase = "idle" | "dropping" | "glow" | "popping" | "falling";

type ReelCellProps = {
  cell: BoardCell | null;
  col: number;
  row: number;
  phase: ReelPhase;
  win: boolean;
  isSpawn: boolean;
  isFallen: boolean;
  fallDist: number;
};

/**
 * Single reel cell — memoized so only cells whose props change re-render
 * during tumble phases.
 */
export const ReelCell = memo(function ReelCell({
  cell,
  col,
  row,
  phase,
  win,
  isSpawn,
  isFallen,
  fallDist,
}: ReelCellProps) {
  const popping = phase === "popping" && win;
  const glowing = phase === "glow" && win;
  const winFx = glowing || popping;
  const isInitialDrop = phase === "dropping" && !!cell;
  const isGravityDrop =
    phase === "falling" && !!cell && (isSpawn || isFallen) && fallDist > 0;
  const dropRows = isInitialDrop ? row + 1.35 : fallDist;
  const isScatter = cell?.sym.scatter;

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0",
        phase === "dropping" || phase === "falling" || isScatter || winFx
          ? "overflow-visible"
          : "overflow-hidden",
        isScatter
          ? "z-[30]"
          : winFx
            ? "z-[25]"
            : isInitialDrop || isGravityDrop
              ? "z-[1]"
              : "",
      )}
    >
      {cell && (
        <motion.div
          key={cell.key}
          className="absolute inset-[0.5%] flex items-center justify-center will-change-transform"
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
                  scale: [1.08, 1.28, 0],
                  opacity: [1, 1, 0],
                  rotate: [0, -12, 18],
                  y: [0, -10, 14],
                  filter: [
                    "brightness(1) saturate(1)",
                    "brightness(1.45) saturate(1.35)",
                    "brightness(2) saturate(0.5)",
                  ],
                }
              : glowing
                ? {
                    y: 0,
                    opacity: 1,
                    scale: [1, 1.12, 1.06],
                    filter: [
                      "brightness(1) saturate(1)",
                      "brightness(1.25) saturate(1.2)",
                      "brightness(1.1) saturate(1.1)",
                    ],
                  }
                : {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                    filter: "brightness(1) saturate(1)",
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
              : glowing
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
          <WinSparkles phase={phase} active={winFx} />
          <Mahjong3Icon
            kind={cell.sym.kind}
            isGold={cell.isGold}
            className={cn(
              "relative z-[1] size-full",
              winFx && "drop-shadow-[0_0_16px_rgba(250,204,21,0.95)]",
            )}
          />
        </motion.div>
      )}
    </div>
  );
});
