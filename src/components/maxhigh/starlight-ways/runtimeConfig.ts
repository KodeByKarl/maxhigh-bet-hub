import type { StarlightWaysConfig } from "@/lib/starlight-ways-config";
import { DEFAULT_STARLIGHT_WAYS_CONFIG } from "@/lib/starlight-ways-config";

let activeConfig: StarlightWaysConfig = { ...DEFAULT_STARLIGHT_WAYS_CONFIG };

export function getStarlightWaysConfig(): StarlightWaysConfig {
  return activeConfig;
}

export function setStarlightWaysConfig(cfg: StarlightWaysConfig) {
  activeConfig = cfg;
}
