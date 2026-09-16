import { memo } from "react";
import { ReelCell, type ReelPhase } from "./ReelCell";
import type { BoardCell } from "./types";
import { REEL_HEIGHTS, cellIndex } from "./types";

type Slot = BoardCell | null;

export type ReelVisuals = {
  slots: Slot[];
  phase: ReelPhase;
  winningKeys: Set<string>;
  payoutByKey: Map<string, number>;
  spawnedKeys: Set<string>;
  fallenKeys: Set<string>;
  fallDistance: Record<string, number>;
};

type ReelGridProps = {
  visuals: ReelVisuals;
};

/**
 * Glacier pillars 4-5-6-5-4 — rounded ice tiles (no hex clip, no image cut).
 * Still distinct from diamond circles & 5×5 squares.
 */
export const ReelGrid = memo(function ReelGrid({ visuals }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } =
    visuals;

  return (
    <div className="flex w-full max-w-6xl items-end justify-center gap-1 overflow-hidden sm:gap-1.5 md:gap-2">
      {REEL_HEIGHTS.map((height, col) => (
        <div
          key={col}
          className="flex w-[19%] max-w-[9.5rem] flex-col justify-end gap-1 overflow-hidden sm:max-w-[10.5rem] sm:gap-1.5 md:max-w-[11.5rem] md:gap-2"
        >
          {Array.from({ length: height }, (_, row) => {
            const i = cellIndex(col, row);
            const cell = slots[i] ?? null;
            const win = cell ? winningKeys.has(cell.key) : false;
            return (
              <ReelCell
                key={`slot-${col}-${row}`}
                col={col}
                row={row}
                cell={cell}
                phase={phase}
                win={win}
                perPay={cell ? payoutByKey.get(cell.key) : undefined}
                isSpawn={cell ? spawnedKeys.has(cell.key) : false}
                isFallen={cell ? fallenKeys.has(cell.key) : false}
                fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
});
