import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Godly Gates: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "olympus",
  frame: "arch",
  deck: "thumb",
  voice: "engraved",
  spin: "coin",
  fx: "stars",
  tune: {
    corner: 14,
    ornament: 0.38,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "godly-gates",
  name: "Godly Gates",
  kind: "slot",
  motif: "olympus",
  skin: skin,
};
