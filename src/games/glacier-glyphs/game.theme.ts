import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Glacier Glyphs: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "gem",
  deck: "console",
  voice: "techno",
  spin: "hex",
  fx: "snow",
  tune: {
    corner: 15,
    ornament: 0.62,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "glacier-glyphs",
  name: "Glacier Glyphs",
  kind: "realms",
  motif: "frost",
  skin: skin,
};
