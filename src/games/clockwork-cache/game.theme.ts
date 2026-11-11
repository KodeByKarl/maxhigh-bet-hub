import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Clockwork Cache: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "clockwork",
  frame: "riveted",
  deck: "thumb",
  voice: "techno",
  spin: "coin",
  fx: "none",
  tune: {
    corner: 12,
    ornament: 0.41,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "clockwork-cache",
  name: "Clockwork Cache",
  kind: "realms",
  motif: "clockwork",
  skin: skin,
};
