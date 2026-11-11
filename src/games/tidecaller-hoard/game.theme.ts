import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Tidecaller Hoard: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "gem",
  deck: "orbit",
  voice: "rounded",
  spin: "petal",
  fx: "bubbles",
  board: "hex",
  atmos: "iris",
  grade: "dream",
  sym: "glow",
  mat: "flat",
  win: "ring",
  tune: {
    corner: 15,
    ornament: 0.41,
    spin: 94,
  },
};

export const gameTheme: GameTheme = {
  id: "tidecaller-hoard",
  name: "Tidecaller Hoard",
  kind: "realms",
  motif: "ocean",
  skin: skin,
};
