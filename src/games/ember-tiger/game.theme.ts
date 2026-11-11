import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Ember Tiger: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "riveted",
  deck: "thumb",
  voice: "impact",
  spin: "blade",
  fx: "embers",
  board: "plate",
  atmos: "mist",
  grade: "deep",
  sym: "glow",
  mat: "emboss",
  win: "flicker",
  tune: {
    corner: 10,
    ornament: 0.43,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "ember-tiger",
  name: "Ember Tiger",
  kind: "slot",
  motif: "fire",
  skin: skin,
};
