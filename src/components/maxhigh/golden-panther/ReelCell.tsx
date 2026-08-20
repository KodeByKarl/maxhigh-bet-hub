import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIM } from "./animationConfig";
import { PantherIcon } from "./PantherIcon";
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
  isTop?: boolean;
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
  isTop,
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

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0",
        phase === "dropping" || phase === "falling" || isScatter || isWinLit
          ? "overflow-visible"
          : "overflow-hidden",
        isScatter
          ? "z-[30]"
          : isWinLit
            ? "z-[3]"
            : (isInitialDrop || isGravityDrop)
              ? "z-[1]"
              : "",
      )}
    >
      {cell && (
        <motion.div
          key={cell.key}
          className="absolute inset-[2%] flex items-center justify-center will-change-transform"
          initial={
            isInitialDrop || isGravityDrop
              ? {
                  x: isTop ? `${(dropRows || cols) * 100}%` : 0,
                  y: isTop ? 0 : `${-dropRows * 100}%`,
                  opacity: isSpawn || isInitialDrop ? 0.55 : 1,
                  scale: isSpawn || isInitialDrop ? 0.92 : 1,
                }
              : false
          }
          animate={
            popping
              ? {
                  scale: [1.12, 1.28, 0],
                  opacity: [1, 1, 0],
                  rotate: [0, -10, 14],
                  y: [0, -8, 12],
                }
              : phase === "glow" && win
                ? {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: [1.04, 1.14, 1.08],
                  }
                : {
                    x: 0,
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
                      ...(isTop
                        ? {
                            x: {
                              type: "spring",
                              stiffness: 420,
                              damping: 26,
                              mass: 0.85,
                              delay: col * ((isInitialDrop ? ANIM.dropStaggerCol : ANIM.fallStaggerCol) / 1000),
                            },
                          }
                        : {
                            y: {
                              type: "spring",
                              stiffness: 420,
                              damping: 26,
                              mass: 0.85,
                              delay:
                                col * ((isInitialDrop ? ANIM.dropStaggerCol : ANIM.fallStaggerCol) / 1000) +
                                row * ((isInitialDrop ? ANIM.dropStaggerRow : ANIM.fallStaggerRow) / 1000) * 0.45,
                            },
                          }),
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
          {/* Soft gold bloom behind winning symbols */}
          {isWinLit && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-[-28%] z-0 rounded-full"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{
                opacity: popping ? [0.95, 1, 0] : [0.55, 0.95, 0.7],
                scale: popping ? [1.05, 1.35, 0.6] : [0.9, 1.18, 1.02],
              }}
              transition={
                popping
                  ? { duration: ANIM.popDuration / 1000, ease: "easeOut" }
                  : {
                      duration: 0.7,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    }
              }
              style={{
                background:
                  "radial-gradient(circle, rgba(255,250,220,0.95) 0%, rgba(250,204,21,0.75) 32%, rgba(245,158,11,0.35) 58%, transparent 78%)",
                boxShadow:
                  "0 0 22px 8px rgba(250,204,21,0.55), 0 0 48px 16px rgba(253,224,71,0.35)",
              }}
            />
          )}
          <PantherIcon
            kind={cell.sym.kind}
            mult={cell.mult}
            winLit={isWinLit}
            className="relative z-[1] size-full"
          />
          {isWinLit && perPay != null && perPay > 0 && (
              <motion.span
                initial={{ y: 6, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className="absolute top-0 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full border border-white bg-gradient-to-b from-yellow-100 to-amber-400 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-amber-950 shadow-[0_0_14px_rgba(250,204,21,0.95)]"
              >
                +₱{Number.isInteger(perPay) ? perPay : perPay.toFixed(2)}
              </motion.span>
            )}
        </motion.div>
      )}
    </div>
  );
});
