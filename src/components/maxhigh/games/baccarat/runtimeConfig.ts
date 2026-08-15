import { DEFAULT_BACCARAT_CONFIG, type BaccaratConfig } from "@/lib/baccarat-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: BaccaratConfig = structuredClone(DEFAULT_BACCARAT_CONFIG);

export function getBaccaratConfig(): BaccaratConfig {
  return active;
}

export function setBaccaratConfig(cfg: BaccaratConfig) {
  active = cfg;
}
