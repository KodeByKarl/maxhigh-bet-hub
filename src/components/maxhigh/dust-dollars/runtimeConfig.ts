import type { DustDollarsConfig } from "@/lib/dust-dollars-config";
import { DEFAULT_DUST_DOLLARS_CONFIG } from "@/lib/dust-dollars-config";

let active: DustDollarsConfig = structuredClone(DEFAULT_DUST_DOLLARS_CONFIG);

export function getDustDollarsConfig(): DustDollarsConfig {
  return active;
}

export function setDustDollarsConfig(cfg: DustDollarsConfig) {
  active = cfg;
}
