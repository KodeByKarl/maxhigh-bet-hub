import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Shogun Sakura: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "ziggurat",
  deck: "console",
  voice: "engraved",
  spin: "petal",
  fx: "dust",
  board: "arch",
  atmos: "sunburst",
  grade: "warm",
  sym: "medal",
  mat: "emboss",
  win: "flare",
  tune: {
    corner: 14,
    ornament: 0.44,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "shogun-sakura",
  name: "Shogun Sakura",
  kind: "realms",
  motif: "temple",
  skin: skin,
};
