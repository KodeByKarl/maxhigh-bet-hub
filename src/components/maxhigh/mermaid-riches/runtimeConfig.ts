/**
 * Active Mermaid Riches config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_MERMAID_RICHES_CONFIG,
  normalizeMermaidRichesConfig,
  type MermaidRichesConfig,
} from "@/lib/mermaid-riches-config";
import type { CellSym } from "./types";

let active: MermaidRichesConfig = structuredClone(DEFAULT_MERMAID_RICHES_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getMermaidRichesConfig(): MermaidRichesConfig {
  return active;
}

export function setMermaidRichesConfig(raw: unknown) {
  active = normalizeMermaidRichesConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
