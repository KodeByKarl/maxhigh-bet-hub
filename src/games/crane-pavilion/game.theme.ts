import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Crane Pavilion: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "spirit",
  frame: "petal",
  deck: "thumb",
  voice: "rounded",
  spin: "coin",
  fx: "motes",
  board: "circle",
  atmos: "aurora",
  grade: "dream",
  sym: "outline",
  mat: "outline",
  win: "ring",
  tune: {
    corner: 14,
    ornament: 0.52,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "crane-pavilion",
  name: "Crane Pavilion",
  kind: "realms",
  motif: "spirit",
  skin: skin,
};
