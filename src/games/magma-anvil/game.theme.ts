import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Magma Anvil: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "bevel",
  deck: "console",
  voice: "impact",
  spin: "petal",
  fx: "embers",
  tune: {
    corner: 20,
    ornament: 0.48,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "magma-anvil",
  name: "Magma Anvil",
  kind: "realms",
  motif: "fire",
  skin: skin,
};
