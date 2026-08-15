/**
 * Active Candy Blast config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_CANDY_BLAST_CONFIG,
  normalizeCandyBlastConfig,
  type CandyBlastConfig,
} from "@/lib/candy-blast-config";
import type { CellSym } from "./types";

let active: CandyBlastConfig = structuredClone(DEFAULT_CANDY_BLAST_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getCandyBlastConfig(): CandyBlastConfig {
  return active;
}

export function setCandyBlastConfig(raw: unknown) {
  active = normalizeCandyBlastConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
