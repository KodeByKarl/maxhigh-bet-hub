import {
  DEFAULT_FORTUNE_GEMS_CONFIG,
  normalizeFortuneGemsConfig,
  type FortuneGemsConfig,
} from "@/lib/fortune-gems-config";

let current: FortuneGemsConfig = structuredClone(DEFAULT_FORTUNE_GEMS_CONFIG);

export function getFortuneGemsConfig(): FortuneGemsConfig {
  return current;
}

export function setFortuneGemsConfig(raw: unknown) {
  current = normalizeFortuneGemsConfig(raw);
  return current;
}
