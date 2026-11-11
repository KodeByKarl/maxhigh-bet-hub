import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Monarch Meadow: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "spirit",
  frame: "scroll",
  deck: "console",
  voice: "rounded",
  spin: "hex",
  fx: "motes",
  board: "arch",
  atmos: "mist",
  grade: "dream",
  sym: "glow",
  mat: "glass",
  win: "ring",
  tune: {
    corner: 11,
    ornament: 0.59,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "monarch-meadow",
  name: "Monarch Meadow",
  kind: "realms",
  motif: "spirit",
  skin: skin,
};
