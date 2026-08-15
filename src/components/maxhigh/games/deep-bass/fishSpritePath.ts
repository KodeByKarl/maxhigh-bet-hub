import type { FishTierId } from "@/lib/deep-bass-config";
import { DEEP_BASS_ASSET } from "./animationConfig";

/** Kept for any code that still resolves PNG paths (lobby thumbs, etc.). */
const SPRITE_FILE: Record<FishTierId, string> = {
  common: "shiner.png",
  uncommon: "smallmouth.png",
  rare: "largemouth.png",
  elite: "striped-trophy.png",
  super: "super-bass.png",
  boss: "deep-bass-boss.png",
  crate: "golden-lure-crate.png",
};

export function fishSpritePath(tierId: FishTierId): string {
  return `${DEEP_BASS_ASSET.symbolDir}/${SPRITE_FILE[tierId]}`;
}
