import {
  DEFAULT_POKER_SHOWDOWN_CONFIG,
  type PokerShowdownConfig,
} from "@/lib/poker-showdown-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: PokerShowdownConfig = structuredClone(DEFAULT_POKER_SHOWDOWN_CONFIG);

export function getPokerShowdownConfig(): PokerShowdownConfig {
  return active;
}

export function setPokerShowdownConfig(cfg: PokerShowdownConfig) {
  active = cfg;
}
