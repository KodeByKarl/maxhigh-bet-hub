/**
 * Active Beach Bonanza config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_BEACH_BONANZA_CONFIG,
  normalizeBeachBonanzaConfig,
  type BeachBonanzaConfig,
} from "@/lib/beach-bonanza-config";
import type { CellSym } from "./types";

let active: BeachBonanzaConfig = structuredClone(DEFAULT_BEACH_BONANZA_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getBeachBonanzaConfig(): BeachBonanzaConfig {
  return active;
}

export function setBeachBonanzaConfig(raw: unknown) {
  active = normalizeBeachBonanzaConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
