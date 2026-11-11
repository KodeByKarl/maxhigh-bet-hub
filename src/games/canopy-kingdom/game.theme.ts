import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Canopy Kingdom: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "scroll",
  deck: "thumb",
  voice: "slab",
  spin: "shield",
  fx: "leaves",
  board: "hex",
  atmos: "godrays",
  grade: "natural",
  sym: "glow",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 9,
    ornament: 0.5,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "canopy-kingdom",
  name: "Canopy Kingdom",
  kind: "realms",
  motif: "jungle",
  skin: skin,
};
