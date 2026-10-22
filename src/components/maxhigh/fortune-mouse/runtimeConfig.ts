/**
 * Active Fortune Mouse config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_FORTUNE_MOUSE_CONFIG,
  normalizeFortuneMouseConfig,
  type FortuneMouseConfig,
} from "@/lib/fortune-mouse-config";
import type { CellSym } from "./types";

let active: FortuneMouseConfig = structuredClone(DEFAULT_FORTUNE_MOUSE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getFortuneMouseConfig(): FortuneMouseConfig {
  return active;
}

export function setFortuneMouseConfig(raw: unknown) {
  active = normalizeFortuneMouseConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
