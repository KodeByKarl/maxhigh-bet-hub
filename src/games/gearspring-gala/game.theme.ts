import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Gearspring Gala: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "clockwork",
  frame: "riveted",
  deck: "rail",
  voice: "techno",
  spin: "blade",
  fx: "none",
  board: "hex",
  atmos: "mist",
  grade: "warm",
  sym: "emboss",
  mat: "outline",
  win: "sweep",
  tune: {
    corner: 9,
    ornament: 0.48,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "gearspring-gala",
  name: "Gearspring Gala",
  kind: "realms",
  motif: "clockwork",
  skin: skin,
};
