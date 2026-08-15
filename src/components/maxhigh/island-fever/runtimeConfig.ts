/**
 * Active Island Fever config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_ISLAND_FEVER_CONFIG,
  normalizeIslandFeverConfig,
  type IslandFeverConfig,
} from "@/lib/island-fever-config";
import type { CellSym } from "./types";

let active: IslandFeverConfig = structuredClone(DEFAULT_ISLAND_FEVER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getIslandFeverConfig(): IslandFeverConfig {
  return active;
}

export function setIslandFeverConfig(raw: unknown) {
  active = normalizeIslandFeverConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
