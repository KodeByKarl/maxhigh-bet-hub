import {
  DEFAULT_FIRE_SPIKE_CONFIG,
  normalizeFireSpikeConfig,
  type FireSpikeConfig,
} from "@/lib/fire-spike-config";

let current: FireSpikeConfig = structuredClone(DEFAULT_FIRE_SPIKE_CONFIG);

export function getFireSpikeConfig(): FireSpikeConfig {
  return current;
}

export function setFireSpikeConfig(raw: unknown) {
  current = normalizeFireSpikeConfig(raw);
  return current;
}
