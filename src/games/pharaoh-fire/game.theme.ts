import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Pharaoh Fire: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "egypt",
  frame: "ziggurat",
  deck: "console",
  voice: "impact",
  spin: "blade",
  fx: "embers",
  board: "slab",
  atmos: "horizon",
  grade: "deep",
  sym: "medal",
  mat: "outline",
  win: "sweep",
  tune: {
    corner: 18,
    ornament: 0.39,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "pharaoh-fire",
  name: "Pharaoh Fire",
  kind: "slot",
  motif: "egypt",
  skin: skin,
};
