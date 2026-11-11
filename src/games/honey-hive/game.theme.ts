import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Honey Hive: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "grove",
  frame: "gem",
  deck: "dock",
  voice: "rounded",
  spin: "hex",
  fx: "motes",
  board: "hex",
  atmos: "mist",
  grade: "natural",
  sym: "glow",
  mat: "glass",
  win: "ring",
  tune: {
    corner: 17,
    ornament: 0.62,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "honey-hive",
  name: "Honey Hive",
  kind: "slot",
  motif: "grove",
  skin: skin,
};
