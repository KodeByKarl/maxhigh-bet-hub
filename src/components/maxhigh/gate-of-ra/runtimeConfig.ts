/**
 * Active Gate of Ra config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_GATE_OF_RA_CONFIG,
  normalizeGateOfRaConfig,
  type GateOfRaConfig,
} from "@/lib/gate-of-ra-config";
import type { CellSym } from "./types";

let active: GateOfRaConfig = structuredClone(DEFAULT_GATE_OF_RA_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getGateOfRaConfig(): GateOfRaConfig {
  return active;
}

export function setGateOfRaConfig(raw: unknown) {
  active = normalizeGateOfRaConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
