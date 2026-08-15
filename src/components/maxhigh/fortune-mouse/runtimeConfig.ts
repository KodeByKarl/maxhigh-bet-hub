import {
  DEFAULT_FORTUNE_MOUSE_CONFIG,
  normalizeFortuneMouseConfig,
  type FortuneMouseConfig,
} from "@/lib/fortune-mouse-config";

let current: FortuneMouseConfig = structuredClone(DEFAULT_FORTUNE_MOUSE_CONFIG);

export function getFortuneMouseConfig(): FortuneMouseConfig {
  return current;
}

export function setFortuneMouseConfig(raw: unknown) {
  current = normalizeFortuneMouseConfig(raw);
  return current;
}
