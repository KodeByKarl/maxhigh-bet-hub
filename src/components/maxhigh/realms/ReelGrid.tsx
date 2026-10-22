import { memo, type CSSProperties } from "react";
import type { BoardCell } from "./engine/types";
import { ReelCell, type ReelPhase, type SymbolArt } from "./ReelCell";

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
  cols: number;
  rows: number;
  art: SymbolArt;
  visuals: ReelVisuals;
};

/** Any board shape — width follows the cols/rows ratio so the grid fills the play well. */
export const ReelGrid = memo(function ReelGrid({ cols, rows, art, visuals }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } = visuals;
  const style = {
    "--board-ar": cols / rows,
    aspectRatio: `${cols} / ${rows}`,
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  } as CSSProperties;

  return (
    <div
      className="mx-auto grid max-h-[min(62dvh,34rem)] w-[min(98vw,calc(62dvh*var(--board-ar)),40rem)] gap-1 sm:max-h-[min(64dvh,38rem)] sm:w-[min(96vw,calc(64dvh*var(--board-ar)),44rem)] sm:gap-1.5"
      style={style}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const cell = slots[i] ?? null;
        return (
          <ReelCell
            key={`slot-${i}`}
            index={i}
            cols={cols}
            art={art}
            cell={cell}
            phase={phase}
            win={cell ? winningKeys.has(cell.key) : false}
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
