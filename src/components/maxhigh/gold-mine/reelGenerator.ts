import type { FgSymKind, GoldMineConfig } from "@/lib/gold-mine-config";
import type { Rng } from "./rng";
import type { FgGrid } from "./types";

export function pickSymbol(
  rng: Rng,
  reelIndex: number,
  cfg: GoldMineConfig,
  isFreeSpins: boolean,
): FgSymKind {
  let total = 0;
  const weights: number[] = [];
  for (const sym of cfg.symbols) {
    const w = isFreeSpins ? sym.reelWeightsFreeSpins[reelIndex] ?? 0 : sym.reelWeights[reelIndex] ?? 0;
    weights.push(w);
    total += w;
  }
  if (total <= 0) return cfg.symbols[0].kind;
  let roll = rng() * total;
  for (let i = 0; i < cfg.symbols.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return cfg.symbols[i].kind;
  }
  return cfg.symbols[cfg.symbols.length - 1].kind;
}

function reelHeight(cfg: GoldMineConfig, reel: number): number {
  return cfg.reelHeights?.[reel] ?? cfg.rowsCount;
}

export function generateGrid(
  rng: Rng,
  cfg: GoldMineConfig,
  opts?: { isFreeSpins?: boolean },
): FgGrid {
  const isFreeSpins = !!opts?.isFreeSpins;
  const grid: FgGrid = [];
  for (let r = 0; r < cfg.reelsCount; r++) {
    const height = reelHeight(cfg, r);
    const col: FgSymKind[] = [];
    for (let row = 0; row < height; row++) {
      col.push(pickSymbol(rng, r, cfg, isFreeSpins));
    }
    grid.push(col);
  }
  return grid;
}

export function countKind(grid: FgGrid, kind: FgSymKind): number {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell === kind) n++;
  return n;
}

export function listBonusPositions(grid: FgGrid): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let row = 0; row < (grid[r]?.length ?? 0); row++) {
      if (grid[r][row] === "bonus") out.push([r, row]);
    }
  }
  return out;
}
