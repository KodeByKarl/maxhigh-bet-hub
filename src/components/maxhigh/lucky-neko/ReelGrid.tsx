import { memo, type ReactNode } from "react";
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
  /** Overlay rendered on the frame (e.g. the tumble-win badge). */
  children?: ReactNode;
};

/** Metal box-fitting (kanagu) for one frame corner; the other three are mirrored with CSS. */
const CORNER_FIT = "M2 2 H27 Q31 2 31 6 V10 H14 Q10 10 10 14 V31 H6 Q2 31 2 27 Z";

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg
      className={`nk-corner nk-corner--${pos}`}
      viewBox="0 0 34 34"
      aria-hidden
      focusable="false"
    >
      <path className="fit" d={CORNER_FIT} />
      <circle cx="6.2" cy="6.2" r="2.1" />
      <path className="vein" d="M12 5.2 H25 M5.2 12 V25" />
    </svg>
  );
}

/** 6×6 board inside the lacquer reel frame. Board geometry (COLS × ROWS) is unchanged. */
export const ReelGrid = memo(function ReelGrid({ visuals, children }: ReelGridProps) {
  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } = visuals;

  return (
    <div className="nk-frame" data-nk-frame>
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <linearGradient id="nk-corner-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6dc94" />
            <stop offset="0.5" stopColor="#c9983f" />
            <stop offset="1" stopColor="#7a5520" />
          </linearGradient>
        </defs>
      </svg>
      <div className="nk-well">
        <div
          className="nk-board"
          data-nk-board
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
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
      {children}
    </div>
  );
});
