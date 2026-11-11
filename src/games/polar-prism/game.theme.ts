import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Polar Prism: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "gem",
  deck: "orbit",
  voice: "techno",
  spin: "blade",
  fx: "snow",
  board: "hex",
  atmos: "mist",
  grade: "cool",
  sym: "plain",
  mat: "glass",
  win: "sweep",
  tune: {
    corner: 18,
    ornament: 0.45,
    spin: 104,
  },
};

export const gameTheme: GameTheme = {
  id: "polar-prism",
  name: "Polar Prism",
  kind: "realms",
  motif: "frost",
  skin: skin,
};
