import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Safari Gold: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "savanna",
  frame: "scroll",
  deck: "console",
  voice: "slab",
  spin: "lozenge",
  fx: "dust",
  board: "slab",
  atmos: "sunburst",
  grade: "warm",
  sym: "plain",
  mat: "emboss",
  win: "ring",
  tune: {
    corner: 8,
    ornament: 0.41,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "safari-gold",
  name: "Safari Gold",
  kind: "slot",
  motif: "savanna",
  skin: skin,
};
