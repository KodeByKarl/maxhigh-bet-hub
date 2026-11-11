import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Enchanted Grove: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "grove",
  frame: "petal",
  deck: "orbit",
  voice: "rounded",
  spin: "petal",
  fx: "motes",
  board: "hex",
  atmos: "godrays",
  grade: "dream",
  sym: "glow",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 18,
    ornament: 0.57,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "enchanted-grove",
  name: "Enchanted Grove",
  kind: "slot",
  motif: "grove",
  skin: skin,
};
