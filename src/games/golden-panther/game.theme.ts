import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Golden Panther: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "scroll",
  deck: "orbit",
  voice: "engraved",
  spin: "coin",
  fx: "dust",
  tune: {
    corner: 10,
    ornament: 0.4,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "golden-panther",
  name: "Golden Panther",
  kind: "slot",
  motif: "jungle",
  skin: skin,
};
