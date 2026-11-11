import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Cosmic Koi: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "cosmos",
  frame: "bevel",
  deck: "console",
  voice: "techno",
  spin: "lozenge",
  fx: "stars",
  tune: {
    corner: 18,
    ornament: 0.39,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "cosmic-koi",
  name: "Cosmic Koi",
  kind: "realms",
  motif: "cosmos",
  skin: skin,
};
