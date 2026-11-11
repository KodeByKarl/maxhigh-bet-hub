import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Lighthouse Loot: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "petal",
  deck: "console",
  voice: "rounded",
  spin: "coin",
  fx: "bubbles",
  tune: {
    corner: 15,
    ornament: 0.42,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "lighthouse-loot",
  name: "Lighthouse Loot",
  kind: "realms",
  motif: "ocean",
  skin: skin,
};
