import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Salamander Sun: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "riveted",
  deck: "dock",
  voice: "impact",
  spin: "shield",
  fx: "embers",
  board: "hex",
  atmos: "horizon",
  grade: "deep",
  sym: "glow",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 12,
    ornament: 0.61,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "salamander-sun",
  name: "Salamander Sun",
  kind: "realms",
  motif: "fire",
  skin: skin,
};
