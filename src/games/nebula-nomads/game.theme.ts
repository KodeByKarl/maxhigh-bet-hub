import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Nebula Nomads: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "cosmos",
  frame: "bevel",
  deck: "orbit",
  voice: "techno",
  spin: "lozenge",
  fx: "stars",
  board: "diamond",
  atmos: "grid",
  grade: "cool",
  sym: "glow",
  mat: "neon",
  win: "sweep",
  tune: {
    corner: 21,
    ornament: 0.43,
    spin: 89,
  },
};

export const gameTheme: GameTheme = {
  id: "nebula-nomads",
  name: "Nebula Nomads",
  kind: "realms",
  motif: "cosmos",
  skin: skin,
};
