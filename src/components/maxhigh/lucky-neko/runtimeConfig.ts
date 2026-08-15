import {
  DEFAULT_LUCKY_NEKO_CONFIG,
  normalizeLuckyNekoConfig,
  type LuckyNekoConfig,
} from "@/lib/lucky-neko-config";

let current: LuckyNekoConfig = structuredClone(DEFAULT_LUCKY_NEKO_CONFIG);

export function getLuckyNekoConfig(): LuckyNekoConfig {
  return current;
}

export function setLuckyNekoConfig(raw: unknown) {
  current = normalizeLuckyNekoConfig(raw);
  return current;
}
