import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Longship Raiders: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "ziggurat",
  deck: "rail",
  voice: "engraved",
  spin: "coin",
  fx: "dust",
  board: "slab",
  atmos: "godrays",
  grade: "warm",
  sym: "emboss",
  mat: "emboss",
  win: "ring",
  tune: {
    corner: 16,
    ornament: 0.45,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "longship-raiders",
  name: "Longship Raiders",
  kind: "realms",
  motif: "temple",
  skin: skin,
};
