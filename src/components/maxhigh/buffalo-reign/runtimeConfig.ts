/**
 * Active Buffalo Reign config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_BUFFALO_REIGN_CONFIG,
  normalizeBuffaloReignConfig,
  type BuffaloReignConfig,
} from "@/lib/buffalo-reign-config";
import type { CellSym } from "./types";

let active: BuffaloReignConfig = structuredClone(DEFAULT_BUFFALO_REIGN_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getBuffaloReignConfig(): BuffaloReignConfig {
  return active;
}

export function setBuffaloReignConfig(raw: unknown) {
  active = normalizeBuffaloReignConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
