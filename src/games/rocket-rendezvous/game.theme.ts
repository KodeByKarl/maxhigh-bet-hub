import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Rocket Rendezvous: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "cosmos",
  frame: "rune",
  deck: "dock",
  voice: "techno",
  spin: "blade",
  fx: "stars",
  tune: {
    corner: 16,
    ornament: 0.54,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "rocket-rendezvous",
  name: "Rocket Rendezvous",
  kind: "realms",
  motif: "cosmos",
  skin: skin,
};
