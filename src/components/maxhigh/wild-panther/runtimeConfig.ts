/**
 * Active Wild Panther config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_WILD_PANTHER_CONFIG,
  normalizeWildPantherConfig,
  type WildPantherConfig,
} from "@/lib/wild-panther-config";
import type { CellSym } from "./types";

let active: WildPantherConfig = structuredClone(DEFAULT_WILD_PANTHER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getWildPantherConfig(): WildPantherConfig {
  return active;
}

export function setWildPantherConfig(raw: unknown) {
  active = normalizeWildPantherConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
