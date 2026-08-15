import {
  DEFAULT_PROSPERITY_LION_CONFIG,
  normalizeProsperityLionConfig,
  type ProsperityLionConfig,
} from "@/lib/prosperity-lion-config";

let current: ProsperityLionConfig = structuredClone(DEFAULT_PROSPERITY_LION_CONFIG);

export function getProsperityLionConfig(): ProsperityLionConfig {
  return current;
}

export function setProsperityLionConfig(raw: unknown) {
  current = normalizeProsperityLionConfig(raw);
  return current;
}
