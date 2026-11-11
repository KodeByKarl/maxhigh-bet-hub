import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Frost Fox: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "gem",
  deck: "thumb",
  voice: "techno",
  spin: "hex",
  fx: "snow",
  tune: {
    corner: 17,
    ornament: 0.5,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "frost-fox",
  name: "Frost Fox",
  kind: "slot",
  motif: "frost",
  skin: skin,
};
