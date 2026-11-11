import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Lucky Neko: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "gem",
  deck: "orbit",
  voice: "rounded",
  spin: "coin",
  fx: "motes",
  board: "ticket",
  atmos: "curtains",
  grade: "natural",
  sym: "outline",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 17,
    ornament: 0.55,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "lucky-neko",
  name: "Lucky Neko",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
