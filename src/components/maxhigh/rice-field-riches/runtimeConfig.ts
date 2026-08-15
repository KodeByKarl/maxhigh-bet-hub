import type { RiceFieldRichesConfig } from "@/lib/rice-field-riches-config";
import { DEFAULT_RICE_FIELD_RICHES_CONFIG } from "@/lib/rice-field-riches-config";

let activeConfig: RiceFieldRichesConfig = { ...DEFAULT_RICE_FIELD_RICHES_CONFIG };

export function getRiceFieldRichesConfig(): RiceFieldRichesConfig {
  return activeConfig;
}

export function setRiceFieldRichesConfig(cfg: RiceFieldRichesConfig) {
  activeConfig = cfg;
}
