/**
 * Active Frost Fox config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_FROST_FOX_CONFIG,
  normalizeFrostFoxConfig,
  type FrostFoxConfig,
} from "@/lib/frost-fox-config";
import type { CellSym } from "./types";

let active: FrostFoxConfig = structuredClone(DEFAULT_FROST_FOX_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getFrostFoxConfig(): FrostFoxConfig {
  return active;
}

export function setFrostFoxConfig(raw: unknown) {
  active = normalizeFrostFoxConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
