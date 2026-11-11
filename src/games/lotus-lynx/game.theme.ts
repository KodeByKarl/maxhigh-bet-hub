import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Lotus Lynx: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "asia",
  frame: "petal",
  deck: "thumb",
  voice: "engraved",
  spin: "petal",
  fx: "motes",
  tune: {
    corner: 17,
    ornament: 0.51,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "lotus-lynx",
  name: "Lotus Lynx",
  kind: "slot",
  motif: "asia",
  skin: skin,
};
