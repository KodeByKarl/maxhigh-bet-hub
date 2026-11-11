import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Wild Panther: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "petal",
  deck: "thumb",
  voice: "slab",
  spin: "blade",
  fx: "leaves",
  tune: {
    corner: 16,
    ornament: 0.43,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "wild-panther",
  name: "Wild Panther",
  kind: "slot",
  motif: "jungle",
  skin: skin,
};
