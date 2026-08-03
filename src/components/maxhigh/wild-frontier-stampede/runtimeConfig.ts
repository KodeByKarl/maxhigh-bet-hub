import type { BuffaloReignConfig } from "@/lib/buffalo-reign-config";
import { DEFAULT_BUFFALO_REIGN_CONFIG } from "@/lib/buffalo-reign-config";

let activeConfig: BuffaloReignConfig = { ...DEFAULT_BUFFALO_REIGN_CONFIG };

export function getBuffaloReignConfig(): BuffaloReignConfig {
  return activeConfig;
}

export function setBuffaloReignConfig(cfg: BuffaloReignConfig) {
  activeConfig = cfg;
}
