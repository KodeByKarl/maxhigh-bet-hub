import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Buffalo Reign: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "savanna",
  frame: "riveted",
  deck: "orbit",
  voice: "slab",
  spin: "shield",
  fx: "dust",
  board: "slab",
  atmos: "horizon",
  grade: "warm",
  sym: "plain",
  mat: "flat",
  win: "sweep",
  tune: {
    corner: 11,
    ornament: 0.6,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "buffalo-reign",
  name: "Buffalo Reign",
  kind: "slot",
  motif: "savanna",
  skin: skin,
};
