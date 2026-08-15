import { DEFAULT_LUCKY_NINE_PLUS_CONFIG, type LuckyNinePlusConfig } from "@/lib/lucky-nine-plus-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: LuckyNinePlusConfig = structuredClone(DEFAULT_LUCKY_NINE_PLUS_CONFIG);

export function getLuckyNinePlusConfig(): LuckyNinePlusConfig {
  return active;
}

export function setLuckyNinePlusConfig(cfg: LuckyNinePlusConfig) {
  active = cfg;
}
