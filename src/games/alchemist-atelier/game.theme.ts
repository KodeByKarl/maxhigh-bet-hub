import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Alchemist Atelier: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "arcane",
  frame: "rune",
  deck: "orbit",
  voice: "engraved",
  spin: "shield",
  fx: "motes",
  board: "chamfer",
  atmos: "iris",
  grade: "dream",
  sym: "glow",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 16,
    ornament: 0.44,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "alchemist-atelier",
  name: "Alchemist Atelier",
  kind: "realms",
  motif: "arcane",
  skin: skin,
};
