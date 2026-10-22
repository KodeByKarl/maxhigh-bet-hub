/**
 * Realms engine types. The engine is pure: every call receives a
 * RealmsEngineCtx (config + board + rng) instead of reading module globals,
 * so 50 titles share one implementation and the server needs no mutex.
 */
import type { RealmsConfig, RealmsSymKind } from "@/lib/realms/schema";

export type CellSym = {
  id: RealmsSymKind;
  kind: RealmsSymKind;
  weight: number;
  pay: [number, number, number];
  scatter?: boolean;
  bomb?: boolean;
};

export type BoardCell = {
  key: string;
  sym: CellSym;
  mult?: number;
};

export type ClusterWin = {
  id: RealmsSymKind;
  kind: RealmsSymKind;
  count: number;
  pay: number;
  perSymbol: number;
  keys: string[];
};

export type TumbleStep = {
  board: BoardCell[];
  winningKeys: string[];
  clusters: ClusterWin[];
  tumbleWin: number;
  bombSum: number;
  afterPop: (BoardCell | null)[];
  afterFall: BoardCell[];
  spawnedKeys: string[];
  fallenKeys: string[];
  fallDistance: Record<string, number>;
};

export type SpinScript = {
  initialBoard: BoardCell[];
  steps: TumbleStep[];
  totalWin: number;
  rawWin: number;
  displayMult: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  isFreeSpins: boolean;
  bombAccumulator: number;
};

export type BoardShape = { cols: number; rows: number };

export type RealmsEngineCtx = {
  cfg: RealmsConfig;
  cols: number;
  rows: number;
  cells: number;
  syms: CellSym[];
  /** Uniform [0, 1). Math.random in play; seeded in simulation. */
  rng: () => number;
  /** Monotonic key source for animation identity. */
  nextKey: () => string;
};

export function createEngineCtx(
  cfg: RealmsConfig,
  board: BoardShape,
  rng: () => number = Math.random,
): RealmsEngineCtx {
  let seq = 0;
  // Per-spin prefix keeps animation keys unique across spins without global state.
  const token = Math.random().toString(36).slice(2, 8);
  return {
    cfg,
    cols: board.cols,
    rows: board.rows,
    cells: board.cols * board.rows,
    syms: cfg.symbols.map((s) => ({
      id: s.id,
      kind: s.kind,
      weight: s.weight,
      pay: [...s.pay],
      scatter: s.scatter,
      bomb: s.bomb,
    })),
    rng,
    nextKey: () => `${token}-${++seq}`,
  };
}
