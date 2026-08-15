/**
 * Active Enchanted Grove config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_ENCHANTED_GROVE_CONFIG,
  normalizeEnchantedGroveConfig,
  type EnchantedGroveConfig,
} from "@/lib/enchanted-grove-config";
import type { CellSym } from "./types";

let active: EnchantedGroveConfig = structuredClone(DEFAULT_ENCHANTED_GROVE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getEnchantedGroveConfig(): EnchantedGroveConfig {
  return active;
}

export function setEnchantedGroveConfig(raw: unknown) {
  active = normalizeEnchantedGroveConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
