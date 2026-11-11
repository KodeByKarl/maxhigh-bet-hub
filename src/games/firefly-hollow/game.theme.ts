import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Firefly Hollow: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "scroll",
  deck: "dock",
  voice: "slab",
  spin: "coin",
  fx: "leaves",
  board: "arch",
  atmos: "mist",
  grade: "natural",
  sym: "glow",
  mat: "emboss",
  win: "ring",
  tune: {
    corner: 12,
    ornament: 0.59,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "firefly-hollow",
  name: "Firefly Hollow",
  kind: "realms",
  motif: "jungle",
  skin: skin,
};
