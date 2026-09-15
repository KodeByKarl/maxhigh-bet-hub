/**
 * Active Coral Cobra config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_CORAL_COBRA_CONFIG,
  normalizeCoralCobraConfig,
  type CoralCobraConfig,
} from "@/lib/coral-cobra-config";
import type { CellSym } from "./types";

let active: CoralCobraConfig = structuredClone(DEFAULT_CORAL_COBRA_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getCoralCobraConfig(): CoralCobraConfig {
  return active;
}

export function setCoralCobraConfig(raw: unknown) {
  active = normalizeCoralCobraConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
