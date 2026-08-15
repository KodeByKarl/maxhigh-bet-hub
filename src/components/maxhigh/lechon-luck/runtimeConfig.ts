import {
  DEFAULT_LECHON_LUCK_CONFIG,
  normalizeLechonLuckConfig,
  type LechonLuckConfig,
} from "@/lib/lechon-luck-config";

let current: LechonLuckConfig = structuredClone(DEFAULT_LECHON_LUCK_CONFIG);

export function getLechonLuckConfig(): LechonLuckConfig {
  return current;
}

export function setLechonLuckConfig(raw: unknown) {
  current = normalizeLechonLuckConfig(raw);
  return current;
}
