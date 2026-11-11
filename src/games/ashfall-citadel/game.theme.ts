import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Ashfall Citadel: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "riveted",
  deck: "thumb",
  voice: "impact",
  spin: "hex",
  fx: "embers",
  board: "chamfer",
  atmos: "horizon",
  grade: "warm",
  sym: "outline",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 12,
    ornament: 0.51,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "ashfall-citadel",
  name: "Ashfall Citadel",
  kind: "realms",
  motif: "fire",
  skin: skin,
};
