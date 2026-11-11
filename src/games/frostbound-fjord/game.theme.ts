import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Frostbound Fjord: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "gem",
  deck: "thumb",
  voice: "techno",
  spin: "petal",
  fx: "snow",
  board: "hex",
  atmos: "mist",
  grade: "cool",
  sym: "glow",
  mat: "glass",
  win: "flare",
  tune: {
    corner: 17,
    ornament: 0.42,
    spin: 99,
  },
};

export const gameTheme: GameTheme = {
  id: "frostbound-fjord",
  name: "Frostbound Fjord",
  kind: "realms",
  motif: "frost",
  skin: skin,
};
