/**
 * Active Boracay Bounce config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_BORACAY_BOUNCE_CONFIG,
  normalizeBoracayBounceConfig,
  type BoracayBounceConfig,
} from "@/lib/boracay-bounce-config";
import type { CellSym } from "./types";

let active: BoracayBounceConfig = structuredClone(DEFAULT_BORACAY_BOUNCE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getBoracayBounceConfig(): BoracayBounceConfig {
  return active;
}

export function setBoracayBounceConfig(raw: unknown) {
  active = normalizeBoracayBounceConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
