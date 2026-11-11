/** Per-game Buy Bonus theme: the only thing a game supplies to the shared modal. Pure data, no React. */
import type { RealmsWorld } from "@/lib/realms/catalog";
import { BESPOKE_GAME_MOTIF, REALMS_WORLD_MOTIF, type BuyBonusMotifId } from "./motifs";

export type BuyBonusTheme = {
  gameId: string;
  /** Display name of the game, shown as the modal's subtitle. */
  gameName: string;
  motif: BuyBonusMotifId;
  /** Main brand colour of the game. */
  accent: string;
  /** Lighter highlight; may equal `accent` (the modal derives its own tints). */
  accentSoft: string;
  /** Deep background colour of the game. */
  deep: string;
  /** Game backdrop artwork (optional: the modal falls back to gradients). */
  backdropSrc?: string;
  /** Featured symbol: the game's own scatter artwork. */
  symbolSrc: string;
};

type PantherLike = {
  name: string;
  assets: { backdrop: string };
  colors: { accent: string; accentSoft: string; accentDeep: string };
};

/** Theme for one of the 30 bespoke games, built from the game's own PantherTheme. */
export function buyBonusThemeFromPanther(
  gameId: string,
  theme: PantherLike,
  symbolSrc: string,
): BuyBonusTheme {
  const motif = BESPOKE_GAME_MOTIF[gameId];
  if (!motif) throw new Error(`No Buy Bonus motif for game "${gameId}"`);
  return {
    gameId,
    gameName: theme.name,
    motif,
    accent: theme.colors.accent,
    accentSoft: theme.colors.accentSoft,
    deep: theme.colors.accentDeep,
    backdropSrc: theme.assets.backdrop,
    symbolSrc,
  };
}

/** Theme for a Realms title: palette is [primary, secondary, glow, deep]. */
export function buyBonusThemeFromRealms(
  def: { id: string; name: string; world: RealmsWorld; palette: [string, string, string, string] },
  assets: { backdrop: string; symbolSrc: string },
): BuyBonusTheme {
  const [primary, , glow, deep] = def.palette;
  return {
    gameId: def.id,
    gameName: def.name,
    motif: REALMS_WORLD_MOTIF[def.world],
    accent: primary,
    accentSoft: glow,
    deep,
    backdropSrc: assets.backdrop,
    symbolSrc: assets.symbolSrc,
  };
}

/* ── colour helpers (hex only; anything else falls back to a safe value) ─────────────────────────────────────────── */

export function parseHex(color: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) … 1 (white). Unparseable colours count as mid-dark. */
export function luminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 0.2;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on `bg`. */
export function readableOn(bg: string): "#0b0b10" | "#ffffff" {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#0b0b10") ? "#ffffff" : "#0b0b10";
}
