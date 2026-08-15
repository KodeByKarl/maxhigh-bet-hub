import {
  DEFAULT_THREE_CARD_POKER_CONFIG,
  type ThreeCardPokerConfig,
} from "@/lib/threecardpoker-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: ThreeCardPokerConfig = structuredClone(DEFAULT_THREE_CARD_POKER_CONFIG);

export function getThreeCardPokerConfig(): ThreeCardPokerConfig {
  return active;
}

export function setThreeCardPokerConfig(cfg: ThreeCardPokerConfig) {
  active = cfg;
}
