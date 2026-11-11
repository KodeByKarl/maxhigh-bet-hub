import { memo } from "react";
import "./owl-board.css";
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

/** 5×4 board inside the celestial observatory frame. Cell order and count are unchanged. */
export const ReelGrid = memo(function ReelGrid({ visuals }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } = visuals;

  return (
    <div className="owl-observatory" data-owl-board>
      <svg
        className="owl-observatory__orbits"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ellipse cx="50" cy="50" rx="47" ry="46" />
        <ellipse cx="50" cy="50" rx="36" ry="35" />
        <ellipse cx="50" cy="50" rx="24" ry="23" />
        <circle cx="97" cy="50" r="1.1" />
        <circle cx="3" cy="50" r="1.1" />
        <circle cx="50" cy="4" r="1.1" />
        <circle cx="50" cy="96" r="1.1" />
      </svg>
      <span className="owl-observatory__star owl-observatory__star--tl" aria-hidden="true" />
      <span className="owl-observatory__star owl-observatory__star--tr" aria-hidden="true" />
      <span className="owl-observatory__star owl-observatory__star--bl" aria-hidden="true" />
      <span className="owl-observatory__star owl-observatory__star--br" aria-hidden="true" />
      <div
        className="owl-observatory__grid grid"
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
    </div>
  );
});
