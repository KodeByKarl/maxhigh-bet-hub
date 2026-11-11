import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Jade Jaguar: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "ziggurat",
  deck: "console",
  voice: "slab",
  spin: "hex",
  fx: "leaves",
  board: "circle",
  atmos: "godrays",
  grade: "natural",
  sym: "outline",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 17,
    ornament: 0.61,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "jade-jaguar",
  name: "Jade Jaguar",
  kind: "slot",
  motif: "jungle",
  skin: skin,
};
