import { memo } from "react";
import { cn } from "@/lib/utils";
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
 * Honeycomb nest 5-6-7-6-5 — pointy hex cells, slight column overlap.
 * Distinct from Frost rounded pillars, Ember circles, Coral squares.
 */
export const ReelGrid = memo(function ReelGrid({ visuals }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } =
    visuals;

  return (
    <div className="flex w-full max-w-6xl items-end justify-center overflow-hidden px-0.5">
      {REEL_HEIGHTS.map((height, col) => (
        <div
          key={col}
          className={cn(
            "flex w-[21%] max-w-[9.25rem] flex-col justify-end gap-[0.35rem] overflow-visible sm:max-w-[10.25rem] sm:gap-1.5 md:max-w-[11rem] md:gap-2",
            col > 0 && "-ml-[2.8%] sm:-ml-[3.2%]",
          )}
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
