/**
 * The ten Realms worlds — shared presentation for the five titles in each:
 * loader copy and the token frame the art generator draws symbols inside.
 */
import type { RealmsWorld } from "./catalog";

export type WorldFrame =
  "bubble" | "star" | "shield" | "hexagon" | "leaf" | "coin" | "gear" | "rune" | "ring" | "diamond";

export type WorldMeta = {
  label: string;
  /** Loader status line; `{name}` is replaced with the title. */
  bootLine: string;
  frame: WorldFrame;
};

export const REALMS_WORLDS: Record<RealmsWorld, WorldMeta> = {
  ocean: { label: "Ocean Depths", bootLine: "Diving toward {name}…", frame: "bubble" },
  celestial: { label: "Celestial", bootLine: "Charting the stars of {name}…", frame: "star" },
  volcanic: { label: "Volcanic", bootLine: "Stoking the fires of {name}…", frame: "shield" },
  frost: { label: "Frost", bootLine: "Thawing the gates of {name}…", frame: "hexagon" },
  jungle: { label: "Jungle & Garden", bootLine: "Wandering into {name}…", frame: "leaf" },
  ancient: { label: "Ancient Realms", bootLine: "Unsealing the vaults of {name}…", frame: "coin" },
  clockwork: { label: "Clockwork", bootLine: "Winding up {name}…", frame: "gear" },
  arcane: { label: "Arcane", bootLine: "Reading the runes of {name}…", frame: "rune" },
  cosmos: { label: "Cosmos", bootLine: "Plotting a course to {name}…", frame: "ring" },
  spirit: { label: "Spirit Animals", bootLine: "Calling the spirits of {name}…", frame: "diamond" },
};
