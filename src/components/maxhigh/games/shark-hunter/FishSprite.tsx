import type { FishTierId } from "@/lib/shark-hunter-config";
import { SwimmingFishGraphic } from "../deep-bass/SwimmingFishGraphic";
import { SHARK_HUNTER_ASSET } from "./animationConfig";

export function FishSprite(
  props: {
    tierId: FishTierId;
    size?: number;
    flipped?: boolean;
    hitFlash?: boolean;
    frozen?: boolean;
    className?: string;
    animSeed?: number;
  },
) {
  return <SwimmingFishGraphic {...props} />;
}

const SPRITE_FILE: Record<FishTierId, string> = {
  common: "shiner.png",
  uncommon: "smallmouth.png",
  rare: "largemouth.png",
  elite: "striped-trophy.png",
  boss: "shark-hunter-boss.png",
  crate: "golden-lure-crate.png",
};

export function fishSpritePath(tierId: FishTierId): string {
  return `${SHARK_HUNTER_ASSET.symbolDir}/${SPRITE_FILE[tierId]}`;
}
