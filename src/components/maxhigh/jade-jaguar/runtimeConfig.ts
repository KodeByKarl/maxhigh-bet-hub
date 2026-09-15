/**
 * Active Jade Jaguar config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_JADE_JAGUAR_CONFIG,
  normalizeJadeJaguarConfig,
  type JadeJaguarConfig,
} from "@/lib/jade-jaguar-config";
import type { CellSym } from "./types";

let active: JadeJaguarConfig = structuredClone(DEFAULT_JADE_JAGUAR_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getJadeJaguarConfig(): JadeJaguarConfig {
  return active;
}

export function setJadeJaguarConfig(raw: unknown) {
  active = normalizeJadeJaguarConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
