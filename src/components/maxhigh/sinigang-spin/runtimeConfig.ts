import {
  DEFAULT_SINIGANG_SPIN_CONFIG,
  normalizeSinigangSpinConfig,
  type SinigangSpinConfig,
} from "@/lib/sinigang-spin-config";

let current: SinigangSpinConfig = structuredClone(DEFAULT_SINIGANG_SPIN_CONFIG);

export function getSinigangSpinConfig(): SinigangSpinConfig {
  return current;
}

export function setSinigangSpinConfig(raw: unknown) {
  current = normalizeSinigangSpinConfig(raw);
  return current;
}
