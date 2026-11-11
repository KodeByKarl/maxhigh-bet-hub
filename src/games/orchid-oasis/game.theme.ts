import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Orchid Oasis: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "jungle",
  frame: "petal",
  deck: "rail",
  voice: "slab",
  spin: "petal",
  fx: "leaves",
  tune: {
    corner: 14,
    ornament: 0.48,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "orchid-oasis",
  name: "Orchid Oasis",
  kind: "realms",
  motif: "jungle",
  skin: skin,
};
