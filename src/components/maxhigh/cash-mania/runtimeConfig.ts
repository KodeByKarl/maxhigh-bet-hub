import {
  DEFAULT_CASH_MANIA_CONFIG,
  normalizeCashManiaConfig,
  type CashManiaConfig,
} from "@/lib/cash-mania-config";

let current: CashManiaConfig = structuredClone(DEFAULT_CASH_MANIA_CONFIG);

export function getCashManiaConfig(): CashManiaConfig {
  return current;
}

export function setCashManiaConfig(raw: unknown) {
  current = normalizeCashManiaConfig(raw);
  return current;
}
