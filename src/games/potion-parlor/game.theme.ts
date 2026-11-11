import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Potion Parlor: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "arcane",
  frame: "rune",
  deck: "dock",
  voice: "engraved",
  spin: "coin",
  fx: "motes",
  tune: {
    corner: 16,
    ornament: 0.56,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "potion-parlor",
  name: "Potion Parlor",
  kind: "realms",
  motif: "arcane",
  skin: skin,
};
