import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Hummingbird Haven: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "petal",
  deck: "console",
  voice: "slab",
  spin: "blade",
  fx: "leaves",
  tune: {
    corner: 17,
    ornament: 0.54,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "hummingbird-haven",
  name: "Hummingbird Haven",
  kind: "realms",
  motif: "jungle",
  skin: skin,
};
