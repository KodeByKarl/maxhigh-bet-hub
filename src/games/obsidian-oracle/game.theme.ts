import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Obsidian Oracle: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "bevel",
  deck: "rail",
  voice: "impact",
  spin: "coin",
  fx: "embers",
  board: "plate",
  atmos: "horizon",
  grade: "deep",
  sym: "glow",
  mat: "neon",
  win: "flicker",
  tune: {
    corner: 18,
    ornament: 0.61,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "obsidian-oracle",
  name: "Obsidian Oracle",
  kind: "realms",
  motif: "fire",
  skin: skin,
};
