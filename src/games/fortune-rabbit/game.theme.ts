import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Fortune Rabbit: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "petal",
  deck: "rail",
  voice: "rounded",
  spin: "lozenge",
  fx: "motes",
  tune: {
    corner: 18,
    ornament: 0.61,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "fortune-rabbit",
  name: "Fortune Rabbit",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
