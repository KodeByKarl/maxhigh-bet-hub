import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Fire Spike: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "bevel",
  deck: "dock",
  voice: "techno",
  spin: "hex",
  fx: "embers",
  tune: {
    corner: 21,
    ornament: 0.52,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "fire-spike",
  name: "Fire Spike",
  kind: "slot",
  motif: "jungle",
  skin: skin,
};
