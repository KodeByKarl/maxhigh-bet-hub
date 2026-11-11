import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Maya Gold: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "ziggurat",
  deck: "rail",
  voice: "slab",
  spin: "hex",
  fx: "leaves",
  tune: {
    corner: 14,
    ornament: 0.44,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "maya-gold",
  name: "Maya Gold",
  kind: "slot",
  motif: "temple",
  skin: skin,
};
