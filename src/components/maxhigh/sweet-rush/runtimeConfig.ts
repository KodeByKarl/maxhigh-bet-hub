/**
 * Active Sweet Rush config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_SWEET_RUSH_CONFIG,
  normalizeSweetRushConfig,
  type SweetRushConfig,
} from "@/lib/sweet-rush-config";
import type { CellSym } from "./types";

let active: SweetRushConfig = structuredClone(DEFAULT_SWEET_RUSH_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getSweetRushConfig(): SweetRushConfig {
  return active;
}

export function setSweetRushConfig(raw: unknown) {
  active = normalizeSweetRushConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
