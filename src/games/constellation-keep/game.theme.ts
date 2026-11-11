import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Constellation Keep: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "celestial",
  frame: "rune",
  deck: "dock",
  voice: "engraved",
  spin: "lozenge",
  fx: "stars",
  board: "glass",
  atmos: "aurora",
  grade: "dream",
  sym: "glow",
  mat: "neon",
  win: "sweep",
  tune: {
    corner: 18,
    ornament: 0.6,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "constellation-keep",
  name: "Constellation Keep",
  kind: "realms",
  motif: "celestial",
  skin: skin,
};
