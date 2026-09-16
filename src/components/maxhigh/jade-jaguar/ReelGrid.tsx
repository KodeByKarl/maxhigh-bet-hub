import { memo } from "react";
import { ReelCell, type ReelPhase } from "./ReelCell";
import type { BoardCell } from "./types";
import { CELLS, COLS, ROWS } from "./types";

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

/** Compact 3×3 jade altar — big square tiles, not pillar nests. */
export const ReelGrid = memo(function ReelGrid({ visuals }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } =
    visuals;

  return (
    <div
      className="mx-auto grid aspect-square w-full max-w-[min(92vw,22rem)] gap-2 sm:max-w-[26rem] sm:gap-2.5 md:max-w-[28rem] md:gap-3"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const cell = slots[i] ?? null;
        const win = cell ? winningKeys.has(cell.key) : false;
        return (
          <ReelCell
            key={`slot-${i}`}
            index={i}
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
  );
});
