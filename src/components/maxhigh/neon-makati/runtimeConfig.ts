import type { NeonMakatiConfig } from "@/lib/neon-makati-config";
import { DEFAULT_NEON_MAKATI_CONFIG } from "@/lib/neon-makati-config";

let activeConfig: NeonMakatiConfig = { ...DEFAULT_NEON_MAKATI_CONFIG };

export function getNeonMakatiConfig(): NeonMakatiConfig {
  return activeConfig;
}

export function setNeonMakatiConfig(cfg: NeonMakatiConfig) {
  activeConfig = cfg;
}
