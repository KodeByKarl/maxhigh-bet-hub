import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Crystal Grimoire: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "arcane",
  frame: "gem",
  deck: "console",
  voice: "engraved",
  spin: "lozenge",
  fx: "motes",
  tune: {
    corner: 18,
    ornament: 0.42,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "crystal-grimoire",
  name: "Crystal Grimoire",
  kind: "realms",
  motif: "arcane",
  skin: skin,
};
