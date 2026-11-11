import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Celtic Clover Court: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "arch",
  deck: "orbit",
  voice: "engraved",
  spin: "lozenge",
  fx: "dust",
  board: "plate",
  atmos: "sunburst",
  grade: "deep",
  sym: "medal",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 16,
    ornament: 0.57,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "celtic-clover-court",
  name: "Celtic Clover Court",
  kind: "realms",
  motif: "temple",
  skin: skin,
};
