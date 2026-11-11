import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Hexbound Library: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "arcane",
  frame: "rune",
  deck: "thumb",
  voice: "engraved",
  spin: "lozenge",
  fx: "motes",
  tune: {
    corner: 20,
    ornament: 0.56,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "hexbound-library",
  name: "Hexbound Library",
  kind: "realms",
  motif: "arcane",
  skin: skin,
};
