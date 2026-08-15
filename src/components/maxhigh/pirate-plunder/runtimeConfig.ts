/**
 * Active Pirate Plunder config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_PIRATE_PLUNDER_CONFIG,
  normalizePiratePlunderConfig,
  type PiratePlunderConfig,
} from "@/lib/pirate-plunder-config";
import type { CellSym } from "./types";

let active: PiratePlunderConfig = structuredClone(DEFAULT_PIRATE_PLUNDER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getPiratePlunderConfig(): PiratePlunderConfig {
  return active;
}

export function setPiratePlunderConfig(raw: unknown) {
  active = normalizePiratePlunderConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
