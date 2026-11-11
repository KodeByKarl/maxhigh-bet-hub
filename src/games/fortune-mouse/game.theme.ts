import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Fortune Mouse: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "gem",
  deck: "rail",
  voice: "rounded",
  spin: "circle",
  fx: "none",
  board: "circle",
  atmos: "iris",
  grade: "natural",
  sym: "medal",
  mat: "outline",
  win: "ring",
  tune: {
    corner: 17,
    ornament: 0.5,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "fortune-mouse",
  name: "Fortune Mouse",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
