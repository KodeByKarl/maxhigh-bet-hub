import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Stag Spirit Glade: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "spirit",
  frame: "scroll",
  deck: "rail",
  voice: "rounded",
  spin: "lozenge",
  fx: "motes",
  board: "ticket",
  atmos: "mist",
  grade: "dream",
  sym: "glow",
  mat: "outline",
  win: "ring",
  tune: {
    corner: 8,
    ornament: 0.53,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "stag-spirit-glade",
  name: "Stag Spirit Glade",
  kind: "realms",
  motif: "spirit",
  skin: skin,
};
