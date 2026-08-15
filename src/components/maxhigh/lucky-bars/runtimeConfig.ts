import {
  DEFAULT_LUCKY_BARS_CONFIG,
  normalizeLuckyBarsConfig,
  type LuckyBarsConfig,
} from "@/lib/lucky-bars-config";

let current: LuckyBarsConfig = structuredClone(DEFAULT_LUCKY_BARS_CONFIG);

export function getLuckyBarsConfig(): LuckyBarsConfig {
  return current;
}

export function setLuckyBarsConfig(raw: unknown) {
  current = normalizeLuckyBarsConfig(raw);
  return current;
}
