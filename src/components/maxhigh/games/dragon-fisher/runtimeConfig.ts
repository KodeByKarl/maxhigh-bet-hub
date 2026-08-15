import {
  DEFAULT_DRAGON_FISHER_CONFIG,
  type DragonFisherConfig,
} from "@/lib/dragon-fisher-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: DragonFisherConfig = structuredClone(DEFAULT_DRAGON_FISHER_CONFIG);

export function getDragonFisherConfig(): DragonFisherConfig {
  return active;
}

export function setDragonFisherConfig(cfg: DragonFisherConfig) {
  active = cfg;
}
