/**
 * Active Panther Peak config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_AZTEC_TREASURE_CONFIG,
  normalizeAztecTreasureConfig,
  type AztecTreasureConfig,
} from "@/lib/aztec-treasure-config";
import type { CellSym } from "./types";

let active: AztecTreasureConfig = structuredClone(DEFAULT_AZTEC_TREASURE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getAztecTreasureConfig(): AztecTreasureConfig {
  return active;
}

export function setAztecTreasureConfig(raw: unknown) {
  active = normalizeAztecTreasureConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
