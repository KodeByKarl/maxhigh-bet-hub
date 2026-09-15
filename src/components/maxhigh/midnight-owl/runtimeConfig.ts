/**
 * Active Midnight Owl config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_MIDNIGHT_OWL_CONFIG,
  normalizeMidnightOwlConfig,
  type MidnightOwlConfig,
} from "@/lib/midnight-owl-config";
import type { CellSym } from "./types";

let active: MidnightOwlConfig = structuredClone(DEFAULT_MIDNIGHT_OWL_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getMidnightOwlConfig(): MidnightOwlConfig {
  return active;
}

export function setMidnightOwlConfig(raw: unknown) {
  active = normalizeMidnightOwlConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
