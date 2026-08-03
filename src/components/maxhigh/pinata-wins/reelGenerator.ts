import type { PwSymKind, PwWinsConfig } from "@/lib/pinata-wins-config";
import { pickWeighted, type Rng } from "./rng";
import { makeCell, type PwCell, type PwGrid } from "./types";

export function pickSymbolKind(
  rng: Rng,
  reelIndex: number,
  cfg: PwWinsConfig,
  isFreeSpins: boolean,
): PwSymKind {
  let total = 0;
  const weights: number[] = [];
  for (const sym of cfg.symbols) {
    const w = isFreeSpins
      ? (sym.reelWeightsFreeSpins[reelIndex] ?? 0)
      : (sym.reelWeights[reelIndex] ?? 0);
    weights.push(w);
    total += w;
  }
  if (total <= 0) return cfg.symbols[0]!.kind;
  let roll = rng() * total;
  for (let i = 0; i < cfg.symbols.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return cfg.symbols[i]!.kind;
  }
  return cfg.symbols[cfg.symbols.length - 1]!.kind;
}

function rollGoldFrame(
  rng: Rng,
  kind: PwSymKind,
  cfg: PwWinsConfig,
  chance: number,
): { framed: boolean; frameMult: number } {
  const sym = cfg.symbols.find((s) => s.kind === kind);
  if (!sym?.goldFrameEligible || sym.wild || sym.scatter) {
    return { framed: false, frameMult: 0 };
  }
  if (rng() >= chance) return { framed: false, frameMult: 0 };
  const picked = pickWeighted(rng, cfg.goldFrameMults);
  return { framed: true, frameMult: picked.mult };
}

export function pickCell(
  rng: Rng,
  reelIndex: number,
  cfg: PwWinsConfig,
  isFreeSpins: boolean,
  goldChance: number,
): PwCell {
  const kind = pickSymbolKind(rng, reelIndex, cfg, isFreeSpins);
  const frame = rollGoldFrame(rng, kind, cfg, goldChance);
  return makeCell(kind, frame.framed, frame.frameMult);
}

export function goldFrameChanceFor(
  cfg: PwWinsConfig,
  isFreeSpins: boolean,
  cascade: boolean,
): number {
  if (isFreeSpins) {
    return cascade ? cfg.goldFrameChanceFreeSpinsCascade : cfg.goldFrameChanceFreeSpinsInitial;
  }
  return cascade ? cfg.goldFrameChanceCascade : cfg.goldFrameChanceInitial;
}

export function generateGrid(
  rng: Rng,
  cfg: PwWinsConfig,
  opts?: { isFreeSpins?: boolean },
): PwGrid {
  const isFreeSpins = !!opts?.isFreeSpins;
  const chance = goldFrameChanceFor(cfg, isFreeSpins, false);
  const grid: PwGrid = [];
  for (let r = 0; r < cfg.reelsCount; r++) {
    const col: PwCell[] = [];
    for (let row = 0; row < cfg.rowsCount; row++) {
      col.push(pickCell(rng, r, cfg, isFreeSpins, chance));
    }
    grid.push(col);
  }
  return grid;
}

export function countKind(grid: PwGrid, kind: PwSymKind): number {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell.kind === kind) n++;
  return n;
}
