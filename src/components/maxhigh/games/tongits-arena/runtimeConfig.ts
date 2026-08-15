import {
  DEFAULT_TONGITS_ARENA_CONFIG,
  type TongitsArenaConfig,
} from "@/lib/tongits-arena-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: TongitsArenaConfig = structuredClone(DEFAULT_TONGITS_ARENA_CONFIG);

export function getTongitsArenaConfig(): TongitsArenaConfig {
  return active;
}

export function setTongitsArenaConfig(cfg: TongitsArenaConfig) {
  active = cfg;
}
