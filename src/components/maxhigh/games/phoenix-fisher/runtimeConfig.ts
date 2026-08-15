import {
  DEFAULT_PHOENIX_FISHER_CONFIG,
  type PhoenixFisherConfig,
} from "@/lib/phoenix-fisher-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: PhoenixFisherConfig = structuredClone(DEFAULT_PHOENIX_FISHER_CONFIG);

export function getPhoenixFisherConfig(): PhoenixFisherConfig {
  return active;
}

export function setPhoenixFisherConfig(cfg: PhoenixFisherConfig) {
  active = cfg;
}
