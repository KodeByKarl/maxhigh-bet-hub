/**
 * Active Prosperity Lion config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_PROSPERITY_LION_CONFIG,
  normalizeProsperityLionConfig,
  type ProsperityLionConfig,
} from "@/lib/prosperity-lion-config";
import type { CellSym } from "./types";

let active: ProsperityLionConfig = structuredClone(DEFAULT_PROSPERITY_LION_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getProsperityLionConfig(): ProsperityLionConfig {
  return active;
}

export function setProsperityLionConfig(raw: unknown) {
  active = normalizeProsperityLionConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
