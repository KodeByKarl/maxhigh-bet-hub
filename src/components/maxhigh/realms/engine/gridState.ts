import { clampBombMult } from "@/lib/realms/schema";
import type { BoardCell, CellSym, RealmsEngineCtx } from "./types";

type Pools = {
  weighted: CellSym[];
  weightTotal: number;
  scatter: CellSym;
  bomb: CellSym;
  pay: CellSym[];
};

/** A ctx's symbols never change, so its pools are built once per ctx. */
const poolCache = new WeakMap<RealmsEngineCtx, Pools>();

function pools(ctx: RealmsEngineCtx): Pools {
  let p = poolCache.get(ctx);
  if (!p) {
    const weighted = ctx.syms.filter((s) => s.weight > 0);
    p = {
      weighted,
      weightTotal: weighted.reduce((a, s) => a + s.weight, 0),
      scatter: ctx.syms.find((s) => s.scatter)!,
      bomb: ctx.syms.find((s) => s.bomb)!,
      pay: ctx.syms.filter((s) => !s.scatter && !s.bomb),
    };
    poolCache.set(ctx, p);
  }
  return p;
}

export function pickSym(ctx: RealmsEngineCtx, ante: boolean): CellSym {
  const { weighted, weightTotal, scatter } = pools(ctx);
  let total = weightTotal;
  if (ante) total += scatter.weight * (ctx.cfg.anteScatterWeightMult - 1);
  let r = ctx.rng() * total;
  for (const s of weighted) {
    const w = ante && s.scatter ? s.weight * ctx.cfg.anteScatterWeightMult : s.weight;
    if (r < w) return s;
    r -= w;
  }
  return weighted[0];
}

export function pickBombMult(ctx: RealmsEngineCtx): number {
  const table = ctx.cfg.bombTable;
  const total = table.reduce((a, b) => a + b.weight, 0);
  let r = ctx.rng() * total;
  for (const b of table) {
    if (r < b.weight) return clampBombMult(b.mult);
    r -= b.weight;
  }
  return clampBombMult(table[0]?.mult ?? 2);
}

export function makeCell(
  ctx: RealmsEngineCtx,
  sym: CellSym,
  freeSpins: boolean,
  forceBomb = false,
  opts?: { allowScatter?: boolean },
): BoardCell {
  const { bomb, pay } = pools(ctx);
  let use = sym;
  if (opts?.allowScatter === false && use.scatter) {
    use = pay[Math.floor(ctx.rng() * pay.length)] ?? use;
  }
  const bombChance =
    (freeSpins ? ctx.cfg.bombChanceFreeSpinsPercent : ctx.cfg.bombChanceBasePercent) / 100;
  if (forceBomb || use.bomb || ctx.rng() < bombChance) {
    return { key: ctx.nextKey(), sym: bomb, mult: pickBombMult(ctx) };
  }
  return { key: ctx.nextKey(), sym: use };
}

/** Deterministic idle board shown before the first spin. */
export function initialBoard(ctx: RealmsEngineCtx): BoardCell[] {
  const { pay } = pools(ctx);
  return Array.from({ length: ctx.cells }, (_, i) => ({
    key: `init-${i}`,
    sym: pay[i % pay.length],
  }));
}

function shuffle<T>(ctx: RealmsEngineCtx, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(ctx.rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True if the board already holds a paying cluster (≥ minCluster matching pays). */
function boardHasPayCluster(board: BoardCell[], minCluster: number): boolean {
  const counts = new Map<string, number>();
  for (const cell of board) {
    if (cell.sym.scatter || cell.sym.bomb) continue;
    counts.set(cell.sym.id, (counts.get(cell.sym.id) ?? 0) + 1);
  }
  for (const n of counts.values()) {
    if (n >= minCluster) return true;
  }
  return false;
}

function randomFill(ctx: RealmsEngineCtx, ante: boolean, freeSpins: boolean): BoardCell[] {
  return Array.from({ length: ctx.cells }, () => makeCell(ctx, pickSym(ctx, ante), freeSpins));
}

/**
 * Build an opening board.
 * Seed path plants a winning low-symbol cluster for hit feel; the dead-spin
 * path retries until the opening board does not already pay.
 */
export function buildBoard(
  ctx: RealmsEngineCtx,
  ante: boolean,
  freeSpins: boolean,
  seedWin = true,
): BoardCell[] {
  const { cfg } = ctx;
  const { pay } = pools(ctx);
  const seedChance = 1 - cfg.deadSpinChancePercent / 100;

  if (seedWin && ctx.rng() < seedChance) {
    const board = randomFill(ctx, ante, freeSpins);
    const min = Math.min(cfg.seedClusterMin, cfg.seedClusterMax);
    const max = Math.max(cfg.seedClusterMin, cfg.seedClusterMax);
    const lows = pay.filter((s) => s.kind.startsWith("l"));
    const pool = lows.length ? lows : pay;
    const target =
      ctx.rng() < cfg.seedBiasPercent / 100
        ? (pay.find((s) => s.id === "l3") ?? pool[0])
        : pool[Math.floor(ctx.rng() * pool.length)];
    const count = min + Math.floor(ctx.rng() * (max - min + 1));
    const indices = shuffle(
      ctx,
      Array.from({ length: ctx.cells }, (_, i) => i),
    );
    for (let k = 0; k < Math.min(count, ctx.cells); k++) {
      board[indices[k]] = makeCell(ctx, target, freeSpins);
    }
    return board;
  }

  if (seedWin) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const board = randomFill(ctx, ante, freeSpins);
      if (!boardHasPayCluster(board, cfg.minCluster)) return board;
    }
  }

  return randomFill(ctx, ante, freeSpins);
}

export function cloneBoard(board: BoardCell[]): BoardCell[] {
  return board.map((c) => ({ ...c, sym: c.sym }));
}

/** Buy-feature intro board: filler plus exactly `freeSpinsTriggerCount` scatters. */
export function buildBuyScatterIntroBoard(ctx: RealmsEngineCtx, ante: boolean): BoardCell[] {
  const { scatter } = pools(ctx);
  const board = randomFill(ctx, ante, false);
  const indices = shuffle(
    ctx,
    Array.from({ length: ctx.cells }, (_, i) => i),
  );
  const count = Math.min(ctx.cfg.freeSpinsTriggerCount, ctx.cells);
  for (let k = 0; k < count; k++) {
    board[indices[k]] = { key: ctx.nextKey(), sym: scatter };
  }
  return board;
}
