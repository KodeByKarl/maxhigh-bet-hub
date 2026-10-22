import type { StampedeConfig } from "@/lib/wild-frontier-stampede-config";
import { DEFAULT_STAMPEDE_CONFIG } from "@/lib/wild-frontier-stampede-config";

let activeConfig: StampedeConfig = { ...DEFAULT_STAMPEDE_CONFIG };

export function getStampedeConfig(): StampedeConfig {
  return activeConfig;
}

export function setStampedeConfig(cfg: StampedeConfig) {
  activeConfig = cfg;
}
