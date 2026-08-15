import {
  DEFAULT_FIESTA_FIREWORKS_CONFIG,
  normalizeFiestaFireworksConfig,
  type FiestaFireworksConfig,
} from "@/lib/fiesta-fireworks-config";

let current: FiestaFireworksConfig = structuredClone(DEFAULT_FIESTA_FIREWORKS_CONFIG);

export function getFiestaFireworksConfig(): FiestaFireworksConfig {
  return current;
}

export function setFiestaFireworksConfig(raw: unknown) {
  current = normalizeFiestaFireworksConfig(raw);
  return current;
}
