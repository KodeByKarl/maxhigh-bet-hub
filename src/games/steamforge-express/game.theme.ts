import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Steamforge Express: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "clockwork",
  frame: "riveted",
  deck: "dock",
  voice: "techno",
  spin: "circle",
  fx: "none",
  tune: {
    corner: 9,
    ornament: 0.38,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "steamforge-express",
  name: "Steamforge Express",
  kind: "realms",
  motif: "clockwork",
  skin: skin,
};
