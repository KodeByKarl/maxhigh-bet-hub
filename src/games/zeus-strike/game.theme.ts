import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Zeus Strike: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "olympus",
  frame: "arch",
  deck: "rail",
  voice: "engraved",
  spin: "blade",
  fx: "bolt",
  tune: {
    corner: 14,
    ornament: 0.54,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "zeus-strike",
  name: "Zeus Strike",
  kind: "slot",
  motif: "olympus",
  skin: skin,
};
