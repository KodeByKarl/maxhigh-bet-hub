import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Thor Thunder: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "storm",
  frame: "riveted",
  deck: "rail",
  voice: "impact",
  spin: "shield",
  fx: "bolt",
  tune: {
    corner: 8,
    ornament: 0.58,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "thor-thunder",
  name: "Thor Thunder",
  kind: "slot",
  motif: "storm",
  skin: skin,
};
