import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Thunderbird Totem: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "spirit",
  frame: "scroll",
  deck: "orbit",
  voice: "rounded",
  spin: "shield",
  fx: "motes",
  tune: {
    corner: 8,
    ornament: 0.59,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "thunderbird-totem",
  name: "Thunderbird Totem",
  kind: "realms",
  motif: "spirit",
  skin: skin,
};
