import {
  DEFAULT_OCTOPUS_ARMADA_CONFIG,
  type OctopusArmadaConfig,
} from "@/lib/octopus-armada-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: OctopusArmadaConfig = structuredClone(DEFAULT_OCTOPUS_ARMADA_CONFIG);

export function getOctopusArmadaConfig(): OctopusArmadaConfig {
  return active;
}

export function setOctopusArmadaConfig(cfg: OctopusArmadaConfig) {
  active = cfg;
}
