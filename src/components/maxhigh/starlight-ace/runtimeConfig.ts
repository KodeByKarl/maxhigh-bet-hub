import type { StarlightAceConfig } from "@/lib/starlight-ace-config";
import { DEFAULT_STARLIGHT_ACE_CONFIG } from "@/lib/starlight-ace-config";

let activeConfig: StarlightAceConfig = { ...DEFAULT_STARLIGHT_ACE_CONFIG };

export function getStarlightAceConfig(): StarlightAceConfig {
  return activeConfig;
}

export function setStarlightAceConfig(cfg: StarlightAceConfig) {
  activeConfig = cfg;
}
