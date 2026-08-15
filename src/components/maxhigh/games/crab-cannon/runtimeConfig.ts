import {
  DEFAULT_CRAB_CANNON_CONFIG,
  type CrabCannonConfig,
} from "@/lib/crab-cannon-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: CrabCannonConfig = structuredClone(DEFAULT_CRAB_CANNON_CONFIG);

export function getCrabCannonConfig(): CrabCannonConfig {
  return active;
}

export function setCrabCannonConfig(cfg: CrabCannonConfig) {
  active = cfg;
}
