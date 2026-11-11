import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Starfall Sanctum: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "celestial",
  frame: "rune",
  deck: "thumb",
  voice: "engraved",
  spin: "shield",
  fx: "stars",
  board: "glass",
  atmos: "aurora",
  grade: "deep",
  sym: "glow",
  mat: "glass",
  win: "sweep",
  tune: {
    corner: 16,
    ornament: 0.43,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "starfall-sanctum",
  name: "Starfall Sanctum",
  kind: "realms",
  motif: "celestial",
  skin: skin,
};
