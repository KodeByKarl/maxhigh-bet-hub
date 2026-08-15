import type { ManilaNightsConfig } from "@/lib/manila-nights-config";
import { DEFAULT_MANILA_NIGHTS_CONFIG } from "@/lib/manila-nights-config";

let activeConfig: ManilaNightsConfig = { ...DEFAULT_MANILA_NIGHTS_CONFIG };

export function getManilaNightsConfig(): ManilaNightsConfig {
  return activeConfig;
}

export function setManilaNightsConfig(cfg: ManilaNightsConfig) {
  activeConfig = cfg;
}
