import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Persian Peacock: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "arch",
  deck: "thumb",
  voice: "engraved",
  spin: "circle",
  fx: "dust",
  board: "plate",
  atmos: "sunburst",
  grade: "deep",
  sym: "emboss",
  mat: "emboss",
  win: "flare",
  tune: {
    corner: 17,
    ornament: 0.61,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "persian-peacock",
  name: "Persian Peacock",
  kind: "realms",
  motif: "temple",
  skin: skin,
};
