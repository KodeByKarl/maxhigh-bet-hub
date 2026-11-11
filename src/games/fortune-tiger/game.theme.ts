import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Fortune Tiger: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "bevel",
  deck: "console",
  voice: "impact",
  spin: "shield",
  fx: "embers",
  board: "arch",
  atmos: "curtains",
  grade: "natural",
  sym: "medal",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 22,
    ornament: 0.53,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "fortune-tiger",
  name: "Fortune Tiger",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
