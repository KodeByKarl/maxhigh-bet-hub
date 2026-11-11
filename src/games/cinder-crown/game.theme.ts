import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Cinder Crown: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "fire",
  frame: "riveted",
  deck: "orbit",
  voice: "impact",
  spin: "lozenge",
  fx: "embers",
  tune: {
    corner: 11,
    ornament: 0.6,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "cinder-crown",
  name: "Cinder Crown",
  kind: "realms",
  motif: "fire",
  skin: skin,
};
