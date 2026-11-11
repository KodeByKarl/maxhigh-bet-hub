import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Temple Rush: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "ziggurat",
  deck: "thumb",
  voice: "slab",
  spin: "shield",
  fx: "dust",
  board: "arch",
  atmos: "sunburst",
  grade: "warm",
  sym: "medal",
  mat: "emboss",
  win: "ring",
  tune: {
    corner: 16,
    ornament: 0.55,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "temple-rush",
  name: "Temple Rush",
  kind: "slot",
  motif: "temple",
  skin: skin,
};
