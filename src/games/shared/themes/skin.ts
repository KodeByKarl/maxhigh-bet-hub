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
export const BOARDS = [
  "tiles",
  "circle",
  "hex",
  "diamond",
  "arch",
  "chamfer",
  "ticket",
  "slab",
  "glass",
  "plate",
] as const;
export const ATMOSPHERES = [
  "godrays",
  "spotlight",
  "horizon",
  "mist",
  "curtains",
  "iris",
  "aurora",
  "grid",
  "rain",
  "sunburst",
  "none",
] as const;
export const GRADES = ["natural", "warm", "cool", "noir", "dream", "deep"] as const;
export const SYMBOLS = ["plain", "glow", "outline", "emboss", "medal"] as const;
export const MATERIALS = ["flat", "outline", "neon", "emboss", "glass"] as const;
export const WINS = ["ring", "flare", "sweep", "flicker"] as const;
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
export type Board = (typeof BOARDS)[number];
export type Atmosphere = (typeof ATMOSPHERES)[number];
export type Grade = (typeof GRADES)[number];
export type SymbolLook = (typeof SYMBOLS)[number];
export type Material = (typeof MATERIALS)[number];
export type WinFx = (typeof WINS)[number];

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
  /** cell geometry of the reel board */
  board: Board;
  /** background composition drawn over the artwork */
  atmos: Atmosphere;
  /** colour treatment of the backdrop artwork */
  grade: Grade;
  /** how symbols are rendered on their cells */
  sym: SymbolLook;
  /** material of the control panel and buttons */
  mat: Material;
  /** how winning cells light up */
  win: WinFx;
  tune: SkinTune;
};

/** Table and fishing games keep their bespoke UI; they get an atmosphere, a backdrop grade, a typeface and a frame ring. */
export type TableSkin = {
  motif: BuyBonusMotifId;
  atmos: Atmosphere;
  grade: Grade;
  voice: Voice;
  ring: "gold" | "glow" | "none";
  /** game accent and deep colours (hex) */
  accent: string;
  deep: string;
};

export type GameKind = "slot" | "realms" | "table" | "fishing";

/** What every game folder's `game.theme.ts` exports. Table and fishing games have their own bespoke UIs and carry no slot skin yet. */
export type GameTheme = {
  id: string;
  name: string;
  kind: GameKind;
  motif: BuyBonusMotifId;
  skin: GameSkin | null;
  tableSkin?: TableSkin;
};
