import {
  DEFAULT_WHALE_WAR_CONFIG,
  type WhaleWarConfig,
} from "@/lib/whale-war-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: WhaleWarConfig = structuredClone(DEFAULT_WHALE_WAR_CONFIG);

export function getWhaleWarConfig(): WhaleWarConfig {
  return active;
}

export function setWhaleWarConfig(cfg: WhaleWarConfig) {
  active = cfg;
}
