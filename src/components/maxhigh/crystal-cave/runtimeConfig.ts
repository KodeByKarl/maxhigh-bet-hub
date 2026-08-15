import type { CrystalCaveConfig } from "@/lib/crystal-cave-config";
import { DEFAULT_CRYSTAL_CAVE_CONFIG } from "@/lib/crystal-cave-config";

let active: CrystalCaveConfig = structuredClone(DEFAULT_CRYSTAL_CAVE_CONFIG);

export function getCrystalCaveConfig(): CrystalCaveConfig {
  return active;
}

export function setCrystalCaveConfig(cfg: CrystalCaveConfig) {
  active = cfg;
}
