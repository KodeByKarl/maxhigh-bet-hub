/**
 * Presentation identity of a game. Pure data: no gameplay, pricing, RNG or server code reads it.
 *   frame – silhouette + ornament of the reel well
 *   deck  – arrangement of the control panel (where Spin / bet / tools sit)
 *   voice – typeface character of the control panel
 *   spin  – shape of the Spin button
 *   fx    – one cheap ambient effect behind the board
 * `tune` are per-game fine adjustments consumed by the shared stylesheet (corner size, ring, ornament strength, spin size).
 */
import type { BuyBonusMotifId } from "@/components/maxhigh/buy-bonus/motifs";

export const FRAMES = [
  "arch",
  "bevel",
  "ziggurat",
  "scroll",
  "gem",
  "riveted",
  "petal",
  "rune",
] as const;
export const DECKS = ["dock", "thumb", "orbit", "console", "rail"] as const;
export const VOICES = ["engraved", "impact", "rounded", "techno", "slab"] as const;
export const SPINS = ["circle", "shield", "lozenge", "hex", "petal", "blade", "coin"] as const;
export const FXS = [
  "embers",
  "snow",
  "bolt",
  "motes",
  "leaves",
  "bubbles",
  "stars",
  "dust",
  "none",
] as const;

export type Frame = (typeof FRAMES)[number];
export type DeckLayout = (typeof DECKS)[number];
export type Voice = (typeof VOICES)[number];
export type SpinShape = (typeof SPINS)[number];
export type Fx = (typeof FXS)[number];

export type SkinTune = {
  /** corner cut / radius in px */
  corner: number;
  /** ornament band opacity, 0–1 */
  ornament: number;
  /** Spin button diameter in px (round shapes) */
  spin: number;
};

export type GameSkin = {
  motif: BuyBonusMotifId;
  frame: Frame;
  deck: DeckLayout;
  voice: Voice;
  spin: SpinShape;
  fx: Fx;
  tune: SkinTune;
};

export type GameKind = "slot" | "realms" | "table" | "fishing";

/** What every game folder's `game.theme.ts` exports. Table and fishing games have their own bespoke UIs and carry no slot skin yet. */
export type GameTheme = {
  id: string;
  name: string;
  kind: GameKind;
  motif: BuyBonusMotifId;
  skin: GameSkin | null;
};
