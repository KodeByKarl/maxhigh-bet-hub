import {
  DEFAULT_SARI_SARI_SPIN_CONFIG,
  normalizeSariSariSpinConfig,
  type SariSariSpinConfig,
} from "@/lib/sari-sari-spin-config";

let current: SariSariSpinConfig = structuredClone(DEFAULT_SARI_SARI_SPIN_CONFIG);

export function getSariSariSpinConfig(): SariSariSpinConfig {
  return current;
}

export function setSariSariSpinConfig(raw: unknown) {
  current = normalizeSariSariSpinConfig(raw);
  return current;
}
