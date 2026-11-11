import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Brass Zeppelin: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "clockwork",
  frame: "gem",
  deck: "orbit",
  voice: "techno",
  spin: "shield",
  fx: "none",
  board: "chamfer",
  atmos: "grid",
  grade: "noir",
  sym: "outline",
  mat: "emboss",
  win: "ring",
  tune: {
    corner: 17,
    ornament: 0.45,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "brass-zeppelin",
  name: "Brass Zeppelin",
  kind: "realms",
  motif: "clockwork",
  skin: skin,
};
