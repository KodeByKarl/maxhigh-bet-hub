import type { BuyBonusMotifId } from "./motifs";

/**
 * Small repeating ornament tile per motif, returned as a CSS `url("data:image/svg+xml…")` value tinted with the game's own colour.
 * Tiles are deliberately faint: they texture the panel, they never compete with the price.
 */
const TILES: Record<BuyBonusMotifId, { size: number; body: (c: string) => string }> = {
  // overlapping leaves
  jungle: {
    size: 44,
    body: (c) =>
      `<path d='M6 38C6 20 18 8 36 6c0 18-12 30-30 32z' fill='none' stroke='${c}' stroke-width='1.2'/><path d='M6 38L28 14' stroke='${c}' stroke-width='1'/>`,
  },
  // greek key / meander
  olympus: {
    size: 36,
    body: (c) =>
      `<path d='M2 30V6h28v18H12v-8h10' fill='none' stroke='${c}' stroke-width='1.6' stroke-linejoin='miter'/>`,
  },
  // pyramids + sun disc line
  egypt: {
    size: 48,
    body: (c) =>
      `<path d='M4 40L24 12l20 28z' fill='none' stroke='${c}' stroke-width='1.4'/><path d='M24 12v28M14 28h20' stroke='${c}' stroke-width='1'/>`,
  },
  // flame tongues
  fire: {
    size: 40,
    body: (c) =>
      `<path d='M20 4c6 8 12 12 12 22a12 12 0 01-24 0c0-6 4-8 6-14 2 4 4 5 6 3 0-4-2-7 0-11z' fill='none' stroke='${c}' stroke-width='1.3'/>`,
  },
  // seigaiha waves
  asia: {
    size: 40,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.2'><circle cx='20' cy='40' r='18'/><circle cx='20' cy='40' r='12'/><circle cx='20' cy='40' r='6'/><circle cx='0' cy='20' r='18'/><circle cx='0' cy='20' r='12'/><circle cx='40' cy='20' r='18'/><circle cx='40' cy='20' r='12'/></g>`,
  },
  // snow crystals
  frost: {
    size: 44,
    body: (c) =>
      `<g stroke='${c}' stroke-width='1.3' fill='none'><path d='M22 6v32M8 14l28 16M36 14L8 30'/><path d='M18 8l4 4 4-4M18 36l4-4 4 4'/></g>`,
  },
  // scallop waves
  ocean: {
    size: 40,
    body: (c) =>
      `<path d='M0 24q10-14 20 0t20 0M0 38q10-14 20 0t20 0' fill='none' stroke='${c}' stroke-width='1.3'/>`,
  },
  // stepped fret
  temple: {
    size: 40,
    body: (c) =>
      `<path d='M4 34h8v-8h8v-8h8v-8h8' fill='none' stroke='${c}' stroke-width='1.6'/><path d='M4 6h8v8' fill='none' stroke='${c}' stroke-width='1.2'/>`,
  },
  // crescent + stars
  night: {
    size: 52,
    body: (c) =>
      `<path d='M20 8a12 12 0 100 24 10 10 0 010-24z' fill='none' stroke='${c}' stroke-width='1.2'/><path d='M40 12l1.6 3.6 3.6.4-2.7 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.7-2.5 3.6-.4z' fill='${c}'/>`,
  },
  // lightning zig-zag
  storm: {
    size: 36,
    body: (c) =>
      `<path d='M20 2L8 20h9l-3 14 14-20h-9z' fill='none' stroke='${c}' stroke-width='1.3'/>`,
  },
  // sun rays
  savanna: {
    size: 48,
    body: (c) =>
      `<g stroke='${c}' stroke-width='1.3' fill='none'><circle cx='24' cy='24' r='7'/><path d='M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6'/></g>`,
  },
  // flowers
  grove: {
    size: 44,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.2'><circle cx='22' cy='22' r='3'/><circle cx='22' cy='12' r='5'/><circle cx='22' cy='32' r='5'/><circle cx='12' cy='22' r='5'/><circle cx='32' cy='22' r='5'/></g>`,
  },
  // stars
  celestial: {
    size: 48,
    body: (c) =>
      `<path d='M24 6l4.6 10.4 11.4 1-8.6 7.6 2.6 11L24 30l-10 6 2.6-11L8 17.4l11.4-1z' fill='none' stroke='${c}' stroke-width='1.2'/>`,
  },
  // runes in circles
  arcane: {
    size: 48,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.2'><circle cx='24' cy='24' r='14'/><path d='M24 12v24M16 18l8 6 8-6M16 32l8-8 8 8'/></g>`,
  },
  // cogs
  clockwork: {
    size: 48,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.3'><circle cx='24' cy='24' r='9'/><circle cx='24' cy='24' r='3'/><path d='M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4'/></g>`,
  },
  // orbit rings
  cosmos: {
    size: 52,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.1'><ellipse cx='26' cy='26' rx='20' ry='8' transform='rotate(-25 26 26)'/><circle cx='26' cy='26' r='5'/></g><circle cx='44' cy='14' r='1.6' fill='${c}'/>`,
  },
  // paw-ish diamonds
  spirit: {
    size: 40,
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.2'><path d='M20 6l10 14-10 14L10 20z'/><circle cx='20' cy='20' r='3'/></g>`,
  },
};

export function motifTileSize(motif: BuyBonusMotifId): number {
  return TILES[motif].size;
}

/** `color` must be a plain hex colour (the tile is embedded in a data URI). */
export function motifPattern(motif: BuyBonusMotifId, color: string): string {
  const tile = TILES[motif];
  const safe = /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#ffffff";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile.size}' height='${tile.size}' viewBox='0 0 ${tile.size} ${tile.size}'>${tile.body(safe)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
