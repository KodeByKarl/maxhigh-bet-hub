import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Aurora Spire: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "celestial",
  frame: "arch",
  deck: "orbit",
  voice: "engraved",
  spin: "hex",
  fx: "stars",
  board: "diamond",
  atmos: "spotlight",
  grade: "deep",
  sym: "glow",
  mat: "neon",
  win: "sweep",
  tune: {
    corner: 18,
    ornament: 0.49,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "aurora-spire",
  name: "Aurora Spire",
  kind: "realms",
  motif: "celestial",
  skin: skin,
};
