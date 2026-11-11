import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Moonjelly Bay: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "petal",
  deck: "rail",
  voice: "rounded",
  spin: "shield",
  fx: "bubbles",
  tune: {
    corner: 18,
    ornament: 0.6,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "moonjelly-bay",
  name: "Moonjelly Bay",
  kind: "realms",
  motif: "ocean",
  skin: skin,
};
