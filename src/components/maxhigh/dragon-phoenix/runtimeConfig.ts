import type { DragonPhoenixConfig } from "@/lib/dragon-phoenix-config";
import { DEFAULT_DRAGON_PHOENIX_CONFIG } from "@/lib/dragon-phoenix-config";

let activeConfig: DragonPhoenixConfig = { ...DEFAULT_DRAGON_PHOENIX_CONFIG };

export function getDragonPhoenixConfig(): DragonPhoenixConfig {
  return activeConfig;
}

export function setDragonPhoenixConfig(cfg: DragonPhoenixConfig) {
  activeConfig = cfg;
}
