import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Tarot Twilight: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "arcane",
  frame: "gem",
  deck: "rail",
  voice: "engraved",
  spin: "petal",
  fx: "motes",
  tune: {
    corner: 18,
    ornament: 0.42,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "tarot-twilight",
  name: "Tarot Twilight",
  kind: "realms",
  motif: "arcane",
  skin: skin,
};
