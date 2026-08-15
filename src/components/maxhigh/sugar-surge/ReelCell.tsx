import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIM, EASE } from "./animationConfig";
import { shadeForMultiplier } from "./multiplierEngine";
import { SugarIcon } from "./SugarIcon";
import type { BoardCell } from "./types";
import { ROWS } from "./types";

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
  positionMult?: number;
  turbo?: boolean;
};

/**
 * Lightweight reel cell — tween drops (Godly Gates style), no per-cell springs.
 * Symbols enter from above the grid container.
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
  positionMult = 0,
  turbo = false,
}: ReelCellProps) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const isDropping = phase === "dropping";
  const isFalling = phase === "falling";
  const popping = phase === "popping" && win;
  const isGlow = phase === "glow" && win;
  const isInitialDrop = isDropping && !!cell;
  const isGravityDrop =
    isFalling && !!cell && (isSpawn || isFallen) && fallDist > 0;
  const shouldDropIn = isInitialDrop || isGravityDrop;

  // Start well ABOVE the reel frame (same idea as Godly Gates).
  const dropRows = isInitialDrop
    ? row + ROWS + 2.25
    : Math.max(fallDist, row + ROWS + 2);
  const dropFrom = `${-dropRows * 100}%`;

  const colDelaySec =
    (col * (isInitialDrop ? ANIM.dropStaggerCol : ANIM.fallStaggerCol) +
      row * (isInitialDrop ? ANIM.dropStaggerRow : ANIM.fallStaggerRow)) /
    1000;
  const dropDelay = turbo ? colDelaySec * 0.45 : colDelaySec;
  const dropMs = ((turbo ? ANIM.dropDuration * 0.5 : ANIM.dropDuration) / 1000);
  const landEase = isFalling ? EASE.bounceLand : EASE.reelStop;
  const shade = shadeForMultiplier(positionMult);
  const motionKey = shouldDropIn
    ? `${cell?.key ?? index}-${phase}`
    : (cell?.key ?? `empty-${index}`);

  const isScatter = cell?.sym.kind === "scat";

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0",
        shouldDropIn || isGlow || isScatter
          ? "overflow-visible"
          : "overflow-hidden",
        isScatter ? "z-[35]" : shouldDropIn || isGlow ? "z-[2]" : "",
      )}
    >
      {/* Static tint — no animated shade (cheap on 7×7) */}
      {shade && (
        <div
          className="pointer-events-none absolute inset-[4%] z-0 rounded-[0.35rem] sm:rounded-md"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${shade.fill} 0%, ${shade.fill} 55%, transparent 100%)`,
            boxShadow: `inset 0 0 0 1.5px ${shade.border}, 0 0 10px ${shade.glow}`,
          }}
        />
      )}

      {cell && (
        <motion.div
          key={motionKey}
          className="absolute inset-[3%] z-[1] flex items-center justify-center will-change-transform"
          initial={
            shouldDropIn
              ? {
                  y: dropFrom,
                  opacity: 0,
                  scale: isInitialDrop || isSpawn ? 0.9 : 0.96,
                }
              : false
          }
          animate={
            popping
              ? { scale: 0, opacity: 0, y: 6 }
              : isGlow
                ? { scale: [1, 1.08, 1], opacity: 1, y: 0 }
                : { y: 0, opacity: 1, scale: 1 }
          }
          transition={
            shouldDropIn
              ? {
                  y: { duration: dropMs, delay: dropDelay, ease: landEase },
                  opacity: {
                    duration: Math.max(0.1, dropMs * 0.2),
                    delay: dropDelay,
                    ease: EASE.softOut,
                  },
                  scale: { duration: dropMs, delay: dropDelay, ease: landEase },
                }
              : popping
                ? {
                    duration: (turbo ? ANIM.popDuration * 0.5 : ANIM.popDuration) / 1000,
                    delay: (col * 0.4 + row * 0.25) * (ANIM.popStagger / 1000),
                    ease: EASE.softOut,
                  }
                : isGlow
                  ? {
                      duration: ANIM.glowDuration / 1000,
                      ease: "easeInOut",
                    }
                  : { duration: 0.15, ease: EASE.softOut }
          }
        >
          <SugarIcon
            kind={cell.sym.kind}
            mult={cell.mult}
            className={cn(
              "size-full",
              isGlow && "drop-shadow-[0_0_10px_rgba(250,204,21,0.75)]",
            )}
          />
          {win &&
            perPay != null &&
            perPay > 0 &&
            (isGlow || popping) && (
              <span className="absolute top-0 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-white bg-gradient-to-b from-yellow-200 to-amber-400 px-1 py-0.5 text-[10px] font-black tabular-nums text-amber-950 shadow">
                +₱{Number.isInteger(perPay) ? perPay : perPay.toFixed(2)}
              </span>
            )}
        </motion.div>
      )}

      {shade && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[3] flex",
            cell ? "items-end justify-center pb-[5%]" : "items-center justify-center",
          )}
        >
          <span
            className="rounded-md border-2 px-1 py-0.5 text-[clamp(9px,2.2vw,13px)] font-black leading-none text-white shadow-md"
            style={{
              borderColor: shade.border,
              background: `linear-gradient(180deg, ${shade.labelFrom}, ${shade.labelTo})`,
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}
          >
            ×{positionMult}
          </span>
        </div>
      )}
    </div>
  );
});
