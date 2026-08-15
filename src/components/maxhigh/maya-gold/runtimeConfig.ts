/**
 * Active Panther Peak config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_MAYA_GOLD_CONFIG,
  normalizeMayaGoldConfig,
  type MayaGoldConfig,
} from "@/lib/maya-gold-config";
import type { CellSym } from "./types";

let active: MayaGoldConfig = structuredClone(DEFAULT_MAYA_GOLD_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getMayaGoldConfig(): MayaGoldConfig {
  return active;
}

export function setMayaGoldConfig(raw: unknown) {
  active = normalizeMayaGoldConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
