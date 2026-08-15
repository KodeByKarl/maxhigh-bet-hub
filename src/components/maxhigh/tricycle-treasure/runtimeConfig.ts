import type { TricycleTreasureConfig } from "@/lib/tricycle-treasure-config";
import { DEFAULT_TRICYCLE_TREASURE_CONFIG } from "@/lib/tricycle-treasure-config";

let active: TricycleTreasureConfig = structuredClone(DEFAULT_TRICYCLE_TREASURE_CONFIG);

export function getTricycleTreasureConfig(): TricycleTreasureConfig {
  return active;
}

export function setTricycleTreasureConfig(cfg: TricycleTreasureConfig) {
  active = cfg;
}
