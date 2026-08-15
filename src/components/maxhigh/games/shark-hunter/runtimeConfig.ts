import {
  DEFAULT_SHARK_HUNTER_CONFIG,
  type SharkHunterConfig,
} from "@/lib/shark-hunter-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: SharkHunterConfig = structuredClone(DEFAULT_SHARK_HUNTER_CONFIG);

export function getSharkHunterConfig(): SharkHunterConfig {
  return active;
}

export function setSharkHunterConfig(cfg: SharkHunterConfig) {
  active = cfg;
}
