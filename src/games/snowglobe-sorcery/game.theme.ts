import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Snowglobe Sorcery: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "frost",
  frame: "bevel",
  deck: "dock",
  voice: "techno",
  spin: "circle",
  fx: "snow",
  board: "hex",
  atmos: "mist",
  grade: "cool",
  sym: "glow",
  mat: "glass",
  win: "sweep",
  tune: {
    corner: 18,
    ornament: 0.38,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "snowglobe-sorcery",
  name: "Snowglobe Sorcery",
  kind: "realms",
  motif: "frost",
  skin: skin,
};
