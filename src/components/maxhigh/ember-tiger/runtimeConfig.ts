/**
 * Active Ember Tiger config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_EMBER_TIGER_CONFIG,
  normalizeEmberTigerConfig,
  type EmberTigerConfig,
} from "@/lib/ember-tiger-config";
import type { CellSym } from "./types";

let active: EmberTigerConfig = structuredClone(DEFAULT_EMBER_TIGER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getEmberTigerConfig(): EmberTigerConfig {
  return active;
}

export function setEmberTigerConfig(raw: unknown) {
  active = normalizeEmberTigerConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
