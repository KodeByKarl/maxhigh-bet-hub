import type { OutlawCoinsConfig } from "@/lib/outlaw-coins-config";
import { DEFAULT_OUTLAW_COINS_CONFIG } from "@/lib/outlaw-coins-config";

let active: OutlawCoinsConfig = structuredClone(DEFAULT_OUTLAW_COINS_CONFIG);

export function getOutlawCoinsConfig(): OutlawCoinsConfig {
  return active;
}

export function setOutlawCoinsConfig(cfg: OutlawCoinsConfig) {
  active = cfg;
}
