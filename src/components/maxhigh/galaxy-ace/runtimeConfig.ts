import type { GalaxyAceConfig } from "@/lib/galaxy-ace-config";
import { DEFAULT_GALAXY_ACE_CONFIG } from "@/lib/galaxy-ace-config";

let activeConfig: GalaxyAceConfig = { ...DEFAULT_GALAXY_ACE_CONFIG };

export function getGalaxyAceConfig(): GalaxyAceConfig {
  return activeConfig;
}

export function setGalaxyAceConfig(cfg: GalaxyAceConfig) {
  activeConfig = cfg;
}
