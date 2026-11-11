import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Desert Riches: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "egypt",
  frame: "scroll",
  deck: "dock",
  voice: "slab",
  spin: "circle",
  fx: "dust",
  board: "plate",
  atmos: "sunburst",
  grade: "warm",
  sym: "emboss",
  mat: "outline",
  win: "flare",
  tune: {
    corner: 12,
    ornament: 0.5,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "desert-riches",
  name: "Desert Riches",
  kind: "slot",
  motif: "egypt",
  skin: skin,
};
