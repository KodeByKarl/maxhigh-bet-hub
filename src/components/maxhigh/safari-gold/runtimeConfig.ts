import type { SafariGoldConfig } from "@/lib/safari-gold-config";
import { DEFAULT_SAFARI_GOLD_CONFIG } from "@/lib/safari-gold-config";

let activeConfig: SafariGoldConfig = { ...DEFAULT_SAFARI_GOLD_CONFIG };

export function getSafariGoldConfig(): SafariGoldConfig {
  return activeConfig;
}

export function setSafariGoldConfig(cfg: SafariGoldConfig) {
  activeConfig = cfg;
}
