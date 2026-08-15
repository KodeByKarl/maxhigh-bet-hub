import type { GoldMineConfig } from "@/lib/gold-mine-config";
import { DEFAULT_GOLD_MINE_CONFIG } from "@/lib/gold-mine-config";

let active: GoldMineConfig = structuredClone(DEFAULT_GOLD_MINE_CONFIG);

export function getGoldMineConfig(): GoldMineConfig {
  return active;
}

export function setGoldMineConfig(cfg: GoldMineConfig) {
  active = cfg;
}
