import { DEFAULT_ACE_HIGH_CONFIG, type AceHighConfig } from "@/lib/ace-high-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: AceHighConfig = structuredClone(DEFAULT_ACE_HIGH_CONFIG);

export function getAceHighConfig(): AceHighConfig {
  return active;
}

export function setAceHighConfig(cfg: AceHighConfig) {
  active = cfg;
}
