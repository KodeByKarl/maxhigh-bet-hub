import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Coral Cobra: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "petal",
  deck: "rail",
  voice: "rounded",
  spin: "hex",
  fx: "bubbles",
  tune: {
    corner: 14,
    ornament: 0.44,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "coral-cobra",
  name: "Coral Cobra",
  kind: "slot",
  motif: "ocean",
  skin: skin,
};
