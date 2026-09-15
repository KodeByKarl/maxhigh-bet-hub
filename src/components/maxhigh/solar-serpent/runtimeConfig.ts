/**
 * Active Solar Serpent config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_SOLAR_SERPENT_CONFIG,
  normalizeSolarSerpentConfig,
  type SolarSerpentConfig,
} from "@/lib/solar-serpent-config";
import type { CellSym } from "./types";

let active: SolarSerpentConfig = structuredClone(DEFAULT_SOLAR_SERPENT_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getSolarSerpentConfig(): SolarSerpentConfig {
  return active;
}

export function setSolarSerpentConfig(raw: unknown) {
  active = normalizeSolarSerpentConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
