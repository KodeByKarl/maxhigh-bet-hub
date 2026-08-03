import {
  DEFAULT_REEL_RIOT_CONFIG,
  normalizeReelRiotConfig,
  type ReelRiotConfig,
} from "@/lib/reel-riot-config";

let current: ReelRiotConfig = structuredClone(DEFAULT_REEL_RIOT_CONFIG);

export function getReelRiotConfig(): ReelRiotConfig {
  return current;
}

export function setReelRiotConfig(raw: unknown) {
  current = normalizeReelRiotConfig(raw);
  return current;
}
