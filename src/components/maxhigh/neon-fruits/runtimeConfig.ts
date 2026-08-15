import {
  DEFAULT_NEON_FRUITS_CONFIG,
  normalizeNeonFruitsConfig,
  type NeonFruitsConfig,
} from "@/lib/neon-fruits-config";

let current: NeonFruitsConfig = structuredClone(DEFAULT_NEON_FRUITS_CONFIG);

export function getNeonFruitsConfig(): NeonFruitsConfig {
  return current;
}

export function setNeonFruitsConfig(raw: unknown) {
  current = normalizeNeonFruitsConfig(raw);
  return current;
}
