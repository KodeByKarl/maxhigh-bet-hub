import {
  DEFAULT_LUCKY_DROP_CONFIG,
  type LuckyDropConfig,
} from "@/lib/lucky-drop-config";

let active: LuckyDropConfig = structuredClone(DEFAULT_LUCKY_DROP_CONFIG);

export function getLuckyDropConfig(): LuckyDropConfig {
  return active;
}

export function setLuckyDropConfig(cfg: LuckyDropConfig) {
  active = cfg;
}
