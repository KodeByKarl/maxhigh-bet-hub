/**
 * Active Desert Riches config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_DESERT_RICHES_CONFIG,
  normalizeDesertRichesConfig,
  type DesertRichesConfig,
} from "@/lib/desert-riches-config";
import type { CellSym } from "./types";

let active: DesertRichesConfig = structuredClone(DEFAULT_DESERT_RICHES_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getDesertRichesConfig(): DesertRichesConfig {
  return active;
}

export function setDesertRichesConfig(raw: unknown) {
  active = normalizeDesertRichesConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
