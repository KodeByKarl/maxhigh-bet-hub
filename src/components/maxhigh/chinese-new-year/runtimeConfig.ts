import {
  DEFAULT_CHINESE_NEW_YEAR_CONFIG,
  normalizeChineseNewYearConfig,
  type ChineseNewYearConfig,
} from "@/lib/chinese-new-year-config";

let current: ChineseNewYearConfig = structuredClone(DEFAULT_CHINESE_NEW_YEAR_CONFIG);

export function getChineseNewYearConfig(): ChineseNewYearConfig {
  return current;
}

export function setChineseNewYearConfig(raw: unknown) {
  current = normalizeChineseNewYearConfig(raw);
  return current;
}
