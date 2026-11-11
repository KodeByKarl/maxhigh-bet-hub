import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Northwind Narwhal: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "bevel",
  deck: "rail",
  voice: "techno",
  spin: "blade",
  fx: "snow",
  tune: {
    corner: 20,
    ornament: 0.44,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "northwind-narwhal",
  name: "Northwind Narwhal",
  kind: "realms",
  motif: "frost",
  skin: skin,
};
