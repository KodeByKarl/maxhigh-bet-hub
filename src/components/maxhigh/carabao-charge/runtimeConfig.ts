import type { CarabaoChargeConfig } from "@/lib/carabao-charge-config";
import { DEFAULT_CARABAO_CHARGE_CONFIG } from "@/lib/carabao-charge-config";

let activeConfig: CarabaoChargeConfig = { ...DEFAULT_CARABAO_CHARGE_CONFIG };

export function getCarabaoChargeConfig(): CarabaoChargeConfig {
  return activeConfig;
}

export function setCarabaoChargeConfig(cfg: CarabaoChargeConfig) {
  activeConfig = cfg;
}
