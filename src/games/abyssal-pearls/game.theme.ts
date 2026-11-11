import type { GameTheme, GameSkin } from "../shared/themes/skin";

/** Abyssal Pearls: control-panel, frame and effect identity. Edit freely; the shared stylesheet reads these values. */
export const skin: GameSkin = {
  motif: "ocean",
  frame: "petal",
  deck: "dock",
  voice: "rounded",
  spin: "circle",
  fx: "bubbles",
  board: "glass",
  atmos: "mist",
  grade: "dream",
  sym: "glow",
  mat: "glass",
  win: "ring",
  tune: {
    corner: 14,
    ornament: 0.46,
    spin: 84,
  },
};

export const gameTheme: GameTheme = {
  id: "abyssal-pearls",
  name: "Abyssal Pearls",
  kind: "realms",
  motif: "ocean",
  skin: skin,
};
