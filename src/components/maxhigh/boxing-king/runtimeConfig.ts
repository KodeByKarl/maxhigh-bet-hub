import {
  DEFAULT_BOXING_KING_CONFIG,
  normalizeBoxingKingConfig,
  type BoxingKingConfig,
} from "@/lib/boxing-king-config";

let current: BoxingKingConfig = structuredClone(DEFAULT_BOXING_KING_CONFIG);

export function getBoxingKingConfig(): BoxingKingConfig {
  return current;
}

export function setBoxingKingConfig(raw: unknown) {
  current = normalizeBoxingKingConfig(raw);
  return current;
}
