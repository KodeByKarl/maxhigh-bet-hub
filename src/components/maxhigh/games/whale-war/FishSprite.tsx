import type { FishTierId } from "@/lib/whale-war-config";
import { SwimmingFishGraphic } from "../deep-bass/SwimmingFishGraphic";
import { WHALE_WAR_ASSET } from "./animationConfig";

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
  boss: "whale-war-boss.png",
  crate: "golden-lure-crate.png",
};

export function fishSpritePath(tierId: FishTierId): string {
  return `${WHALE_WAR_ASSET.symbolDir}/${SPRITE_FILE[tierId]}`;
}
