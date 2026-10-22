/**
 * Active Cleopatra Gold config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_CLEOPATRA_GOLD_CONFIG,
  normalizeCleopatraGoldConfig,
  type CleopatraGoldConfig,
} from "@/lib/cleopatra-gold-config";
import type { CellSym } from "./types";

let active: CleopatraGoldConfig = structuredClone(DEFAULT_CLEOPATRA_GOLD_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getCleopatraGoldConfig(): CleopatraGoldConfig {
  return active;
}

export function setCleopatraGoldConfig(raw: unknown) {
  active = normalizeCleopatraGoldConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
