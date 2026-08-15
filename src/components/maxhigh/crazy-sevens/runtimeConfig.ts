import {
  DEFAULT_CRAZY_SEVENS_CONFIG,
  normalizeCrazySevensConfig,
  type CrazySevensConfig,
} from "@/lib/crazy-sevens-config";

let current: CrazySevensConfig = structuredClone(DEFAULT_CRAZY_SEVENS_CONFIG);

export function getCrazySevensConfig(): CrazySevensConfig {
  return current;
}

export function setCrazySevensConfig(raw: unknown) {
  current = normalizeCrazySevensConfig(raw);
  return current;
}
