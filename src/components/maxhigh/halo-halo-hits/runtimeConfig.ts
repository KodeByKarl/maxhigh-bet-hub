import {
  DEFAULT_HALO_HALO_HITS_CONFIG,
  normalizeHaloHaloHitsConfig,
  type HaloHaloHitsConfig,
} from "@/lib/halo-halo-hits-config";

let current: HaloHaloHitsConfig = structuredClone(DEFAULT_HALO_HALO_HITS_CONFIG);

export function getHaloHaloHitsConfig(): HaloHaloHitsConfig {
  return current;
}

export function setHaloHaloHitsConfig(raw: unknown) {
  current = normalizeHaloHaloHitsConfig(raw);
  return current;
}
