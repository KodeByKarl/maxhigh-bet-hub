import type { DesertRichesConfig } from "@/lib/desert-riches-config";
import { DEFAULT_DESERT_RICHES_CONFIG } from "@/lib/desert-riches-config";

let active: DesertRichesConfig = structuredClone(DEFAULT_DESERT_RICHES_CONFIG);

export function getDesertRichesConfig(): DesertRichesConfig {
  return active;
}

export function setDesertRichesConfig(cfg: DesertRichesConfig) {
  active = cfg;
}
