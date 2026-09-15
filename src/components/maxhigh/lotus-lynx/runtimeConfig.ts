/**
 * Active Lotus Lynx config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_LOTUS_LYNX_CONFIG,
  normalizeLotusLynxConfig,
  type LotusLynxConfig,
} from "@/lib/lotus-lynx-config";
import type { CellSym } from "./types";

let active: LotusLynxConfig = structuredClone(DEFAULT_LOTUS_LYNX_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getLotusLynxConfig(): LotusLynxConfig {
  return active;
}

export function setLotusLynxConfig(raw: unknown) {
  active = normalizeLotusLynxConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
