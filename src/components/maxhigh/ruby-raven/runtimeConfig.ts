/**
 * Active Ruby Raven config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_RUBY_RAVEN_CONFIG,
  normalizeRubyRavenConfig,
  type RubyRavenConfig,
} from "@/lib/ruby-raven-config";
import type { CellSym } from "./types";

let active: RubyRavenConfig = structuredClone(DEFAULT_RUBY_RAVEN_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getRubyRavenConfig(): RubyRavenConfig {
  return active;
}

export function setRubyRavenConfig(raw: unknown) {
  active = normalizeRubyRavenConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
