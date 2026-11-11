import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Cleopatra Gold: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "egypt",
  frame: "scroll",
  deck: "thumb",
  voice: "engraved",
  spin: "lozenge",
  fx: "dust",
  board: "plate",
  atmos: "sunburst",
  grade: "deep",
  sym: "emboss",
  mat: "outline",
  win: "sweep",
  tune: {
    corner: 12,
    ornament: 0.46,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "cleopatra-gold",
  name: "Cleopatra Gold",
  kind: "slot",
  motif: "egypt",
  skin: skin,
};
