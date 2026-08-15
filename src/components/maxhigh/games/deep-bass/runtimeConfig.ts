import {
  DEFAULT_DEEP_BASS_CONFIG,
  type DeepBassConfig,
} from "@/lib/deep-bass-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: DeepBassConfig = structuredClone(DEFAULT_DEEP_BASS_CONFIG);

export function getDeepBassConfig(): DeepBassConfig {
  return active;
}

export function setDeepBassConfig(cfg: DeepBassConfig) {
  active = cfg;
}
