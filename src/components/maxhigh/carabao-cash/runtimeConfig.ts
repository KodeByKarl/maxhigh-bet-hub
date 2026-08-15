import type { CarabaoCashConfig } from "@/lib/carabao-cash-config";
import { DEFAULT_CARABAO_CASH_CONFIG } from "@/lib/carabao-cash-config";

let activeConfig: CarabaoCashConfig = { ...DEFAULT_CARABAO_CASH_CONFIG };

export function getCarabaoCashConfig(): CarabaoCashConfig {
  return activeConfig;
}

export function setCarabaoCashConfig(cfg: CarabaoCashConfig) {
  activeConfig = cfg;
}
