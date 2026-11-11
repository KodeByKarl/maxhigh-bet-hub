import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Solar Serpent: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "rune",
  deck: "orbit",
  voice: "impact",
  spin: "circle",
  fx: "embers",
  tune: {
    corner: 16,
    ornament: 0.58,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "solar-serpent",
  name: "Solar Serpent",
  kind: "slot",
  motif: "fire",
  skin: skin,
};
