/**
 * Active Sugar Surge config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_SUGAR_SURGE_CONFIG,
  normalizeSugarSurgeConfig,
  type SugarSurgeConfig,
} from "@/lib/sugar-surge-config";
import type { CellSym } from "./types";

let active: SugarSurgeConfig = structuredClone(DEFAULT_SUGAR_SURGE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getSugarSurgeConfig(): SugarSurgeConfig {
  return active;
}

export function setSugarSurgeConfig(raw: unknown) {
  active = normalizeSugarSurgeConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
