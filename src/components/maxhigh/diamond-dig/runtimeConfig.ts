import type { DiamondDigConfig } from "@/lib/diamond-dig-config";
import { DEFAULT_DIAMOND_DIG_CONFIG } from "@/lib/diamond-dig-config";

let active: DiamondDigConfig = structuredClone(DEFAULT_DIAMOND_DIG_CONFIG);

export function getDiamondDigConfig(): DiamondDigConfig {
  return active;
}

export function setDiamondDigConfig(cfg: DiamondDigConfig) {
  active = cfg;
}
