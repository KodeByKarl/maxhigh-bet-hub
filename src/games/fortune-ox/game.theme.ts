import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Fortune Ox: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "riveted",
  deck: "dock",
  voice: "slab",
  spin: "coin",
  fx: "none",
  board: "arch",
  atmos: "iris",
  grade: "natural",
  sym: "outline",
  mat: "outline",
  win: "ring",
  tune: {
    corner: 11,
    ornament: 0.51,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "fortune-ox",
  name: "Fortune Ox",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
