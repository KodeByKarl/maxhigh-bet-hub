import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Comet Carnival: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "celestial",
  frame: "arch",
  deck: "console",
  voice: "engraved",
  spin: "blade",
  fx: "stars",
  tune: {
    corner: 16,
    ornament: 0.55,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "comet-carnival",
  name: "Comet Carnival",
  kind: "realms",
  motif: "celestial",
  skin: skin,
};
