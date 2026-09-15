/**
 * Active Honey Hive config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_HONEY_HIVE_CONFIG,
  normalizeHoneyHiveConfig,
  type HoneyHiveConfig,
} from "@/lib/honey-hive-config";
import type { CellSym } from "./types";

let active: HoneyHiveConfig = structuredClone(DEFAULT_HONEY_HIVE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getHoneyHiveConfig(): HoneyHiveConfig {
  return active;
}

export function setHoneyHiveConfig(raw: unknown) {
  active = normalizeHoneyHiveConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
