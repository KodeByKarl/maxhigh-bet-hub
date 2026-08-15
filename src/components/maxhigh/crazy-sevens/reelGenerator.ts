import type { RrSymKind, CrazySevensConfig } from "@/lib/crazy-sevens-config";
import { applyHoldReels, normalizeHoldMask, type HoldMask } from "@/lib/slot-primitives/holdReels";
import type { RrRng } from "./rng";
import type { RrReels, RrVisibleGrid } from "./types";

function pickSymbol(rng: RrRng, cfg: CrazySevensConfig, reel: number): RrSymKind {
  const pool = cfg.symbols
    .map((s) => ({ kind: s.kind, weight: s.reelWeights[reel] ?? 0 }))
    .filter((s) => s.weight > 0);
  if (pool.length === 0) return "cherry";
  return rng.pickWeighted(pool).kind;
}

/** Generate active-line symbols for all 3 reels (ignores hold). */
export function generateReels(rng: RrRng, cfg: CrazySevensConfig): RrReels {
  return Array.from({ length: cfg.reelsCount }, (_, reel) => pickSymbol(rng, cfg, reel));
}

/**
 * Sanitize hold mask: clear illegal holds (e.g. Double Wild when allowHoldWild=false).
 * Server-authoritative — never trust client hold selections alone.
 */
export function sanitizeHoldMask(
  held: HoldMask | boolean[],
  previous: RrReels | null,
  cfg: CrazySevensConfig,
): HoldMask {
  const mask = normalizeHoldMask(held, cfg.reelsCount);
  if (!previous) return mask.map(() => false);
  return mask.map((h, i) => {
    if (!h) return false;
    const sym = previous[i];
    if (!sym) return false;
    if (!cfg.allowHoldWild && sym === "double_wild") return false;
    return true;
  });
}

/**
 * Resolve active payline reels respecting hold mask.
 * Held reels keep `previous` symbols; others re-roll.
 */
export function resolveReelsWithHold(opts: {
  rng: RrRng;
  cfg: CrazySevensConfig;
  previous: RrReels | null;
  held: HoldMask | boolean[];
}): { reels: RrReels; held: HoldMask } {
  const held = sanitizeHoldMask(opts.held, opts.previous, opts.cfg);
  const generated = generateReels(opts.rng, opts.cfg);
  if (!opts.previous || held.every((h) => !h)) {
    return { reels: generated, held };
  }
  return {
    reels: applyHoldReels({
      previous: opts.previous,
      generated,
      held,
    }),
    held,
  };
}

/**
 * Build decorative visible strips around the active row.
 * Neighbors are non-authoritative flavor for the renderer.
 */
export function buildVisibleGrid(
  rng: RrRng,
  cfg: CrazySevensConfig,
  active: RrReels,
): RrVisibleGrid {
  const rows = cfg.visibleRowsPerReel;
  if (rows === 1) {
    return active.map((s) => [s]);
  }
  const grid: RrVisibleGrid = [];
  for (let reel = 0; reel < cfg.reelsCount; reel++) {
    const col: RrSymKind[] = [];
    for (let row = 0; row < rows; row++) {
      if (row === cfg.activeRow) col.push(active[reel]!);
      else col.push(pickSymbol(rng, cfg, reel));
    }
    grid.push(col);
  }
  return grid;
}

export function countDoubleWilds(reels: RrReels): number {
  return reels.filter((s) => s === "double_wild").length;
}
