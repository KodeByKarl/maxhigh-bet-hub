import {
  DEFAULT_LANTERN_LUCK_CONFIG,
  normalizeLanternLuckConfig,
  type LanternLuckConfig,
} from "@/lib/lantern-luck-config";

let current: LanternLuckConfig = structuredClone(DEFAULT_LANTERN_LUCK_CONFIG);

export function getLanternLuckConfig(): LanternLuckConfig {
  return current;
}

export function setLanternLuckConfig(raw: unknown) {
  current = normalizeLanternLuckConfig(raw);
  return current;
}
