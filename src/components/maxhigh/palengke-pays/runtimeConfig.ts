import type { PalengkePaysConfig } from "@/lib/palengke-pays-config";
import { DEFAULT_PALENGKE_PAYS_CONFIG } from "@/lib/palengke-pays-config";

let active: PalengkePaysConfig = structuredClone(DEFAULT_PALENGKE_PAYS_CONFIG);

export function getPalengkePaysConfig(): PalengkePaysConfig {
  return active;
}

export function setPalengkePaysConfig(cfg: PalengkePaysConfig) {
  active = cfg;
}
