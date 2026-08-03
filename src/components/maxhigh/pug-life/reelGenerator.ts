import {
  DAWGS_DEN_WEIGHTS,
  TREAT_YOSELF_WEIGHTS,
  effectiveReelWeights,
  isTreatKind,
  treatTierOf,
  type PlSymKind,
  type PugLifeConfig,
  type PlTreatTier,
} from "@/lib/pug-life-config";
import type { PlRng } from "./rng";
import type { PlCell, PlGrid } from "./types";

export type GridContext = "base" | "treat_yoself" | "dawgs_den" | "featurespins";

function weightsForContext(
  cfg: PugLifeConfig,
  context: GridContext,
): Record<PlSymKind, number[]> {
  if (context === "dawgs_den") return DAWGS_DEN_WEIGHTS;
  if (context === "treat_yoself") return TREAT_YOSELF_WEIGHTS;
  // featurespins uses active profile (caller should set activeRtpProfile=featurespins)
  return effectiveReelWeights(cfg);
}

export function revealTreatMultiplier(
  rng: PlRng,
  tier: PlTreatTier,
  cfg: PugLifeConfig,
): number {
  const table = cfg.treatMultiplierTables[tier];
  if (!table || table.length === 0) return 2;
  return rng.pickWeighted(table).value;
}

function makeCell(rng: PlRng, kind: PlSymKind, cfg: PugLifeConfig): PlCell {
  const cell: PlCell = { kind };
  if (isTreatKind(kind)) {
    const tier = treatTierOf(kind, cfg);
    if (tier) cell.treatMult = revealTreatMultiplier(rng, tier, cfg);
  }
  return cell;
}

export type GenerateGridOpts = {
  context?: GridContext;
  /**
   * Locked sticky cells — these positions are not regenerated.
   * Key = `${reel}:${row}`.
   */
  sticky?: Map<string, PlCell>;
};

/**
 * Fill a diamond grid from weighted reel strips (column length = reelHeights[reel]).
 * Toaster is only generatable when context=dawgs_den and reel is in toasterReels.
 */
export function generateGrid(
  rng: PlRng,
  cfg: PugLifeConfig,
  opts: GenerateGridOpts = {},
): PlGrid {
  const context = opts.context ?? "base";
  const weights = weightsForContext(cfg, context);
  const sticky = opts.sticky;
  const grid: PlGrid = [];
  const heights =
    cfg.reelHeights?.length === cfg.reelsCount
      ? cfg.reelHeights
      : Array.from({ length: cfg.reelsCount }, () => cfg.rowsCount);

  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const column: PlCell[] = [];
    const rowCount = heights[reel] ?? cfg.rowsCount;
    const pool = cfg.symbols
      .map((s) => {
        let w = weights[s.kind]?.[reel] ?? s.reelWeights[reel] ?? 0;
        // Hard-enforce Toaster reel + context restriction
        if (s.toaster) {
          if (context !== "dawgs_den" || !cfg.dawgsDen.toasterReels.includes(reel)) {
            w = 0;
          }
        }
        // Never land toaster outside dawgs_den even if weights leak
        if (s.kind === "toaster" && context !== "dawgs_den") w = 0;
        // Never land scatter inside bonus sessions
        if (s.scatter && (context === "treat_yoself" || context === "dawgs_den")) w = 0;
        return { kind: s.kind, weight: w };
      })
      .filter((s) => s.weight > 0);

    for (let row = 0; row < rowCount; row++) {
      const key = `${reel}:${row}`;
      const locked = sticky?.get(key);
      if (locked) {
        column.push({ ...locked, sticky: true });
        continue;
      }
      if (pool.length === 0) {
        column.push(makeCell(rng, "sym_10", cfg));
      } else {
        column.push(makeCell(rng, rng.pickWeighted(pool).kind, cfg));
      }
    }
    grid.push(column);
  }
  return grid;
}

export function countTreats(grid: PlGrid): {
  count: number;
  positions: Array<[number, number]>;
} {
  const positions: Array<[number, number]> = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < (grid[reel]?.length ?? 0); row++) {
      if (isTreatKind(grid[reel][row].kind)) positions.push([reel, row]);
    }
  }
  return { count: positions.length, positions };
}

export function countScatters(
  grid: PlGrid,
  cfg: PugLifeConfig,
): { count: number; positions: Array<[number, number]> } {
  const positions: Array<[number, number]> = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < (grid[reel]?.length ?? 0); row++) {
      const kind = grid[reel][row].kind;
      if (cfg.symbols.find((s) => s.kind === kind)?.scatter) {
        positions.push([reel, row]);
      }
    }
  }
  return { count: positions.length, positions };
}

export function collectTreatAudit(grid: PlGrid) {
  const out: Array<{ reel: number; row: number; mult: number; kind: PlSymKind }> = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < (grid[reel]?.length ?? 0); row++) {
      const c = grid[reel][row];
      if (isTreatKind(c.kind) && c.treatMult != null) {
        out.push({ reel, row, mult: c.treatMult, kind: c.kind });
      }
    }
  }
  return out;
}
