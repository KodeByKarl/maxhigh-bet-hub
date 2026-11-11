import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Tortoise Treasury: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "spirit",
  frame: "petal",
  deck: "dock",
  voice: "rounded",
  spin: "petal",
  fx: "motes",
  tune: {
    corner: 18,
    ornament: 0.46,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "tortoise-treasury",
  name: "Tortoise Treasury",
  kind: "realms",
  motif: "spirit",
  skin: skin,
};
