/**
 * Reusable primitive: player-selected hold-reels.
 * Held reels keep their prior symbol; only non-held reels re-roll.
 * First used by Reel Riot; available for future classic/retro titles.
 */

export type HoldMask = boolean[];

/**
 * Merge a prior reel snapshot with a freshly generated reel set,
 * preserving held positions.
 */
export function applyHoldReels<T>(opts: {
  previous: T[];
  generated: T[];
  held: HoldMask;
}): T[] {
  const n = Math.max(opts.previous.length, opts.generated.length, opts.held.length);
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    if (opts.held[i] && opts.previous[i] !== undefined) {
      out.push(opts.previous[i]!);
    } else {
      out.push(opts.generated[i]!);
    }
  }
  return out;
}

export function normalizeHoldMask(held: unknown, reelCount: number): HoldMask {
  const src = Array.isArray(held) ? held : [];
  return Array.from({ length: reelCount }, (_, i) => !!src[i]);
}

export function countHeld(held: HoldMask): number {
  return held.filter(Boolean).length;
}
