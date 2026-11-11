import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Prosperity Lion: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "ziggurat",
  deck: "dock",
  voice: "engraved",
  spin: "shield",
  fx: "dust",
  board: "circle",
  atmos: "curtains",
  grade: "natural",
  sym: "outline",
  mat: "flat",
  win: "sweep",
  tune: {
    corner: 14,
    ornament: 0.57,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "prosperity-lion",
  name: "Prosperity Lion",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
