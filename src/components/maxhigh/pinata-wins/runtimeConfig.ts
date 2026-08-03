import type { PwWinsConfig } from "@/lib/pinata-wins-config";
import { DEFAULT_PINATA_WINS_CONFIG } from "@/lib/pinata-wins-config";

let active: PwWinsConfig = structuredClone(DEFAULT_PINATA_WINS_CONFIG);

export function getPinataWinsConfig(): PwWinsConfig {
  return active;
}

export function setPinataWinsConfig(cfg: PwWinsConfig) {
  active = cfg;
}
