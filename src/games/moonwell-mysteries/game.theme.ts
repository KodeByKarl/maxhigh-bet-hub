import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Moonwell Mysteries: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "celestial",
  frame: "rune",
  deck: "rail",
  voice: "engraved",
  spin: "circle",
  fx: "stars",
  board: "circle",
  atmos: "aurora",
  grade: "deep",
  sym: "medal",
  mat: "glass",
  win: "sweep",
  tune: {
    corner: 19,
    ornament: 0.42,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "moonwell-mysteries",
  name: "Moonwell Mysteries",
  kind: "realms",
  motif: "celestial",
  skin: skin,
};
