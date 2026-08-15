import {
  DEFAULT_COIN_VOLCANO_CONFIG,
  normalizeCoinVolcanoConfig,
  type CoinVolcanoConfig,
} from "@/lib/coin-volcano-config";

let current: CoinVolcanoConfig = structuredClone(DEFAULT_COIN_VOLCANO_CONFIG);

export function getCoinVolcanoConfig(): CoinVolcanoConfig {
  return current;
}

export function setCoinVolcanoConfig(raw: unknown) {
  current = normalizeCoinVolcanoConfig(raw);
  return current;
}
