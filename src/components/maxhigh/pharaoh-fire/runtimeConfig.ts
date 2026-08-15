import type { PharaohFireConfig } from "@/lib/pharaoh-fire-config";
import { DEFAULT_PHARAOH_FIRE_CONFIG } from "@/lib/pharaoh-fire-config";

let activeConfig: PharaohFireConfig = { ...DEFAULT_PHARAOH_FIRE_CONFIG };

export function getPharaohFireConfig(): PharaohFireConfig {
  return activeConfig;
}

export function setPharaohFireConfig(cfg: PharaohFireConfig) {
  activeConfig = cfg;
}
