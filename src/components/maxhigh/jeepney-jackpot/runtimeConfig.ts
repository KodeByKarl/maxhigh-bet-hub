import type { JeepneyJackpotConfig } from "@/lib/jeepney-jackpot-config";
import { DEFAULT_JEEPNEY_JACKPOT_CONFIG } from "@/lib/jeepney-jackpot-config";

let active: JeepneyJackpotConfig = structuredClone(DEFAULT_JEEPNEY_JACKPOT_CONFIG);

export function getJeepneyJackpotConfig(): JeepneyJackpotConfig {
  return active;
}

export function setJeepneyJackpotConfig(cfg: JeepneyJackpotConfig) {
  active = cfg;
}
