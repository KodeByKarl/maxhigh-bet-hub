import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Coin Volcano: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "riveted",
  deck: "rail",
  voice: "impact",
  spin: "coin",
  fx: "embers",
  tune: {
    corner: 12,
    ornament: 0.41,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "coin-volcano",
  name: "Coin Volcano",
  kind: "slot",
  motif: "jungle",
  skin: skin,
};
