import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Asteroid Miners: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "cosmos",
  frame: "bevel",
  deck: "thumb",
  voice: "techno",
  spin: "circle",
  fx: "stars",
  board: "diamond",
  atmos: "grid",
  grade: "cool",
  sym: "glow",
  mat: "glass",
  win: "sweep",
  tune: {
    corner: 19,
    ornament: 0.46,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "asteroid-miners",
  name: "Asteroid Miners",
  kind: "realms",
  motif: "cosmos",
  skin: skin,
};
