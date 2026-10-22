/**
 * Active Pharaoh Fire config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_PHARAOH_FIRE_CONFIG,
  normalizePharaohFireConfig,
  type PharaohFireConfig,
} from "@/lib/pharaoh-fire-config";
import type { CellSym } from "./types";

let active: PharaohFireConfig = structuredClone(DEFAULT_PHARAOH_FIRE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getPharaohFireConfig(): PharaohFireConfig {
  return active;
}

export function setPharaohFireConfig(raw: unknown) {
  active = normalizePharaohFireConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
