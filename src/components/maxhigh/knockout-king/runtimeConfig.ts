import {
  DEFAULT_KNOCKOUT_KING_CONFIG,
  normalizeKnockoutKingConfig,
  type KnockoutKingConfig,
} from "@/lib/knockout-king-config";

let current: KnockoutKingConfig = structuredClone(DEFAULT_KNOCKOUT_KING_CONFIG);

export function getKnockoutKingConfig(): KnockoutKingConfig {
  return current;
}

export function setKnockoutKingConfig(raw: unknown) {
  current = normalizeKnockoutKingConfig(raw);
  return current;
}
