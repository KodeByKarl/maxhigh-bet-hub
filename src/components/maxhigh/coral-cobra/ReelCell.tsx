import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIM } from "./animationConfig";
import { PantherIcon } from "./PantherIcon";
import type { BoardCell } from "./types";

export type ReelPhase = "idle" | "dropping" | "glow" | "popping" | "falling";

export type ReelCellProps = {
  index: number;
  cell: BoardCell | null;
  phase: ReelPhase;
  win: boolean;
  perPay?: number;
  isSpawn: boolean;
  isFallen: boolean;
  fallDist: number;
  cols: number;
  isTop?: boolean;
};

function cellPhaseRelevant(props: ReelCellProps, phase: ReelPhase): boolean {
  if (!props.cell) return phase === "dropping" || phase === "falling";
  if (props.win) return phase === "glow" || phase === "popping";
  if (props.isSpawn || props.isFallen) return phase === "falling";
  return phase === "dropping";
}

function reelCellPropsEqual(prev: ReelCellProps, next: ReelCellProps): boolean {
  if (prev.index !== next.index) return false;
  if (prev.cols !== next.cols) return false;
  if (prev.isTop !== next.isTop) return false;
  if (prev.cell?.key !== next.cell?.key) return false;
  if (prev.win !== next.win) return false;
  if (prev.perPay !== next.perPay) return false;
  if (prev.isSpawn !== next.isSpawn) return false;
  if (prev.isFallen !== next.isFallen) return false;
  if (prev.fallDist !== next.fallDist) return false;
  if (prev.phase === next.phase) return true;
  return !cellPhaseRelevant(prev, prev.phase) && !cellPhaseRelevant(next, next.phase);
}

/**
 * Coral Cobra cell — square card tile; icon is cropped to fill the card.
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

  const isScatter = cell?.sym.kind === "lollipop";
  const isWinLit = win && (phase === "glow" || phase === "popping");
  const staggerMode = isInitialDrop ? "drop" : "fall";
  const staggerCol = staggerMode === "drop" ? ANIM.dropStaggerCol : ANIM.fallStaggerCol;
  const staggerRow = staggerMode === "drop" ? ANIM.dropStaggerRow : ANIM.fallStaggerRow;
  const colDelay = (col * staggerCol) / 1000;
  const rowDelay = (row * staggerRow * 0.45) / 1000;

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden rounded-[0.55rem] sm:rounded-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        isScatter || isWinLit ? "z-[3]" : isInitialDrop || isGravityDrop ? "z-[1]" : "z-0",
      )}
      style={{
        border: "1px solid color-mix(in srgb, var(--p-accent-soft) 35%, transparent)",
        background: "color-mix(in srgb, var(--p-well-bottom) 88%, black)",
        boxShadow: isWinLit
          ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 2px var(--p-accent)"
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {cell && (
        <motion.div
          key={cell.key}
          className="absolute inset-0 flex items-center justify-center overflow-hidden will-change-transform"
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
                  scale: [1.08, 1.18, 0],
                  opacity: [1, 1, 0],
                  rotate: [0, -8, 10],
                  y: [0, -6, 10],
                }
              : phase === "glow" && win
                ? {
                    y: 0,
                    opacity: 1,
                    scale: 1.04,
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
                    duration: 0.22,
                    ease: "easeOut",
                  }
                : isInitialDrop || isGravityDrop
                  ? {
                      y: {
                        type: "spring",
                        stiffness: 420,
                        damping: 26,
                        mass: 0.85,
                        delay: colDelay + rowDelay,
                      },
                      opacity: { duration: 0.18, delay: colDelay },
                      scale: {
                        type: "spring",
                        stiffness: 520,
                        damping: 20,
                        delay: colDelay + 0.1,
                      },
                    }
                  : {
                      duration: 0.22,
                      ease: [0.22, 1, 0.36, 1],
                    }
          }
        >
          <PantherIcon
            kind={cell.sym.kind}
            mult={cell.mult}
            winLit={isWinLit}
            className="relative z-[1] size-full"
          />
          {isWinLit && perPay != null && perPay > 0 && (
            <span
              className="absolute top-1 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/90 px-1.5 py-0.5 text-[9px] font-black tabular-nums shadow-sm sm:text-[10px]"
              style={{
                background:
                  "linear-gradient(180deg, var(--p-payout-from) 0%, var(--p-payout-to) 100%)",
                color: "var(--p-payout-text)",
              }}
            >
              +₱{Number.isInteger(perPay) ? perPay : perPay.toFixed(2)}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}, reelCellPropsEqual);
