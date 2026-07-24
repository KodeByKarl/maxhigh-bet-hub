/**
 * Active Candy Peak config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_CANDY_PEAK_CONFIG,
  normalizeCandyPeakConfig,
  type CandyPeakConfig,
} from "@/lib/candy-peak-config";
import type { CellSym } from "./types";

let active: CandyPeakConfig = structuredClone(DEFAULT_CANDY_PEAK_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getCandyPeakConfig(): CandyPeakConfig {
  return active;
}

export function setCandyPeakConfig(raw: unknown) {
  active = normalizeCandyPeakConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
