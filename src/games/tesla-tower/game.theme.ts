import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Tesla Tower: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "clockwork",
  frame: "gem",
  deck: "console",
  voice: "techno",
  spin: "petal",
  fx: "none",
  board: "chamfer",
  atmos: "mist",
  grade: "warm",
  sym: "outline",
  mat: "emboss",
  win: "sweep",
  tune: {
    corner: 14,
    ornament: 0.45,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "tesla-tower",
  name: "Tesla Tower",
  kind: "realms",
  motif: "clockwork",
  skin: skin,
};
