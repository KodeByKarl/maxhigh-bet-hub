import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Ruby Raven: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "night",
  frame: "bevel",
  deck: "orbit",
  voice: "techno",
  spin: "blade",
  fx: "stars",
  tune: {
    corner: 18,
    ornament: 0.45,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "ruby-raven",
  name: "Ruby Raven",
  kind: "slot",
  motif: "night",
  skin: skin,
};
