import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Babylon Gardens: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "temple",
  frame: "ziggurat",
  deck: "dock",
  voice: "engraved",
  spin: "blade",
  fx: "dust",
  tune: {
    corner: 16,
    ornament: 0.58,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "babylon-gardens",
  name: "Babylon Gardens",
  kind: "realms",
  motif: "temple",
  skin: skin,
};
