import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Gate of Ra: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "egypt",
  frame: "ziggurat",
  deck: "orbit",
  voice: "engraved",
  spin: "coin",
  fx: "dust",
  tune: {
    corner: 16,
    ornament: 0.58,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "gate-of-ra",
  name: "Gate of Ra",
  kind: "slot",
  motif: "egypt",
  skin: skin,
};
