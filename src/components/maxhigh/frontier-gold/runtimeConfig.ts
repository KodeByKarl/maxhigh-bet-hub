import type { FrontierGoldConfig } from "@/lib/frontier-gold-config";
import { DEFAULT_FRONTIER_GOLD_CONFIG } from "@/lib/frontier-gold-config";

let active: FrontierGoldConfig = structuredClone(DEFAULT_FRONTIER_GOLD_CONFIG);

export function getFrontierGoldConfig(): FrontierGoldConfig {
  return active;
}

export function setFrontierGoldConfig(cfg: FrontierGoldConfig) {
  active = cfg;
}
