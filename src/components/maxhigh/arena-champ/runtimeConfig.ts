import {
  DEFAULT_ARENA_CHAMP_CONFIG,
  normalizeArenaChampConfig,
  type ArenaChampConfig,
} from "@/lib/arena-champ-config";

let current: ArenaChampConfig = structuredClone(DEFAULT_ARENA_CHAMP_CONFIG);

export function getArenaChampConfig(): ArenaChampConfig {
  return current;
}

export function setArenaChampConfig(raw: unknown) {
  current = normalizeArenaChampConfig(raw);
  return current;
}
