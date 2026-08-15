import {
  DEFAULT_MONEY_COMING_CONFIG,
  normalizeMoneyComingConfig,
  type MoneyComingConfig,
} from "@/lib/money-coming-config";

let current: MoneyComingConfig = structuredClone(DEFAULT_MONEY_COMING_CONFIG);

export function getMoneyComingConfig(): MoneyComingConfig {
  return current;
}

export function setMoneyComingConfig(raw: unknown) {
  current = normalizeMoneyComingConfig(raw);
  return current;
}
