import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Olympus Wrath: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "olympus",
  frame: "arch",
  deck: "console",
  voice: "engraved",
  spin: "shield",
  fx: "bolt",
  tune: {
    corner: 16,
    ornament: 0.51,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "olympus-wrath",
  name: "Olympus Wrath",
  kind: "slot",
  motif: "olympus",
  skin: skin,
};
