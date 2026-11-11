import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Midnight Owl: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "night",
  frame: "rune",
  deck: "orbit",
  voice: "engraved",
  spin: "blade",
  fx: "stars",
  board: "diamond",
  atmos: "iris",
  grade: "deep",
  sym: "glow",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 17,
    ornament: 0.38,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "midnight-owl",
  name: "Midnight Owl",
  kind: "slot",
  motif: "night",
  skin: skin,
};
