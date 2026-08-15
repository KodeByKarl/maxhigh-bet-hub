import {
  DEFAULT_FORTUNE_TIGER_CONFIG,
  normalizeFortuneTigerConfig,
  type FortuneTigerConfig,
} from "@/lib/fortune-tiger-config";

let current: FortuneTigerConfig = structuredClone(DEFAULT_FORTUNE_TIGER_CONFIG);

export function getFortuneTigerConfig(): FortuneTigerConfig {
  return current;
}

export function setFortuneTigerConfig(raw: unknown) {
  current = normalizeFortuneTigerConfig(raw);
  return current;
}
