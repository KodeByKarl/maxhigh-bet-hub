/**
 * Active Thor Thunder config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_THOR_THUNDER_CONFIG,
  normalizeThorThunderConfig,
  type ThorThunderConfig,
} from "@/lib/thor-thunder-config";
import type { CellSym } from "./types";

let active: ThorThunderConfig = structuredClone(DEFAULT_THOR_THUNDER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getThorThunderConfig(): ThorThunderConfig {
  return active;
}

export function setThorThunderConfig(raw: unknown) {
  active = normalizeThorThunderConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
