import { memo } from "react";
import { ReelCell, type ReelPhase } from "./ReelCell";
import type { BoardCell } from "./types";

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
  indices: readonly number[];
  cols: number;
  visuals: ReelVisuals;
  isTop?: boolean;
  indexOffset?: number;
  keyPrefix: string;
};

/** Shared reel cell map — avoids duplicating top/main grid JSX. */
export const ReelGrid = memo(function ReelGrid({
  indices,
  cols,
  visuals,
  isTop = false,
  indexOffset = 0,
  keyPrefix,
}: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } = visuals;

  return (
    <>
      {indices.map((i) => {
        const cell = slots[i] ?? null;
        const win = cell ? winningKeys.has(cell.key) : false;
        return (
          <ReelCell
            key={`${keyPrefix}-${i}`}
            index={i - indexOffset}
            cell={cell}
            phase={phase}
            win={win}
            perPay={cell ? payoutByKey.get(cell.key) : undefined}
            isSpawn={cell ? spawnedKeys.has(cell.key) : false}
            isFallen={cell ? fallenKeys.has(cell.key) : false}
            fallDist={cell ? (fallDistance[cell.key] ?? 0) : 0}
            cols={cols}
            isTop={isTop}
          />
        );
      })}
    </>
  );
});
