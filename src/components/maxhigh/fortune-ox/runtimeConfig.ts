import {
  DEFAULT_FORTUNE_OX_CONFIG,
  normalizeFortuneOxConfig,
  type FortuneOxConfig,
} from "@/lib/fortune-ox-config";

let current: FortuneOxConfig = structuredClone(DEFAULT_FORTUNE_OX_CONFIG);

export function getFortuneOxConfig(): FortuneOxConfig {
  return current;
}

export function setFortuneOxConfig(raw: unknown) {
  current = normalizeFortuneOxConfig(raw);
  return current;
}
