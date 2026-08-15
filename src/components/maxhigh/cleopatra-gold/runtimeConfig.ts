import type { CleopatraGoldConfig } from "@/lib/cleopatra-gold-config";
import { DEFAULT_CLEOPATRA_GOLD_CONFIG } from "@/lib/cleopatra-gold-config";

let activeConfig: CleopatraGoldConfig = { ...DEFAULT_CLEOPATRA_GOLD_CONFIG };

export function getCleopatraGoldConfig(): CleopatraGoldConfig {
  return activeConfig;
}

export function setCleopatraGoldConfig(cfg: CleopatraGoldConfig) {
  activeConfig = cfg;
}
