import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Monsoon Grove: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "petal",
  deck: "orbit",
  voice: "slab",
  spin: "hex",
  fx: "leaves",
  board: "arch",
  atmos: "mist",
  grade: "natural",
  sym: "glow",
  mat: "flat",
  win: "sweep",
  tune: {
    corner: 14,
    ornament: 0.41,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "monsoon-grove",
  name: "Monsoon Grove",
  kind: "realms",
  motif: "jungle",
  skin: skin,
};
