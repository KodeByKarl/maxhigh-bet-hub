import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Saturn Rings: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "cosmos",
  frame: "rune",
  deck: "rail",
  voice: "techno",
  spin: "hex",
  fx: "stars",
  board: "hex",
  atmos: "spotlight",
  grade: "deep",
  sym: "outline",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 18,
    ornament: 0.42,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "saturn-rings",
  name: "Saturn Rings",
  kind: "realms",
  motif: "cosmos",
  skin: skin,
};
