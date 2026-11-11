import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Siren's Lagoon: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "gem",
  deck: "thumb",
  voice: "rounded",
  spin: "lozenge",
  fx: "bubbles",
  tune: {
    corner: 16,
    ornament: 0.59,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "sirens-lagoon",
  name: "Siren's Lagoon",
  kind: "realms",
  motif: "ocean",
  skin: skin,
};
