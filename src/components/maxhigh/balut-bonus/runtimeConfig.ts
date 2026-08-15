import {
  DEFAULT_BALUT_BONUS_CONFIG,
  normalizeBalutBonusConfig,
  type BalutBonusConfig,
} from "@/lib/balut-bonus-config";

let current: BalutBonusConfig = structuredClone(DEFAULT_BALUT_BONUS_CONFIG);

export function getBalutBonusConfig(): BalutBonusConfig {
  return current;
}

export function setBalutBonusConfig(raw: unknown) {
  current = normalizeBalutBonusConfig(raw);
  return current;
}
