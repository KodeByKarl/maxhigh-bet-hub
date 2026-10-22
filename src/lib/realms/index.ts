/**
 * Realms family registry — the single lookup every layer uses (lobby catalog,
 * play registry, settlement server, superadmin) so a title is defined once.
 */
import type { SlotGame } from "@/lib/games";
import { REALMS_GAMES, type RealmsGameDef } from "./catalog";
import { REALMS_TUNING } from "./calibration";
import { REALMS_BUY_CURVE } from "./buy-curve";
import { TARGET_RTP, buildRealmsDefaults, PROFILES } from "./defaults";
import { FAMILY_NAME } from "./family";
import { normalizeRealmsConfig, type RealmsConfig } from "./schema";

export { REALMS_GAMES, type RealmsGameDef } from "./catalog";
export { FAMILY_KEY, FAMILY_LOBBY_VISIBLE, FAMILY_NAME } from "./family";

const BY_ID = new Map(REALMS_GAMES.map((g) => [g.id, g]));

export const REALMS_GAME_IDS: readonly string[] = REALMS_GAMES.map((g) => g.id);

export function isRealmsGameId(id: string): boolean {
  return BY_ID.has(id);
}

export function findRealmsGame(id: string): RealmsGameDef | undefined {
  return BY_ID.get(id);
}

export function getRealmsGame(id: string): RealmsGameDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown ${FAMILY_NAME} game: ${id}`);
  return def;
}

export function realmsCells(def: RealmsGameDef): number {
  return def.board.cols * def.board.rows;
}

const defaultsCache = new Map<string, RealmsConfig>();

/** Calibrated default math for a title (cloned — safe to mutate). */
export function realmsDefaultConfig(id: string): RealmsConfig {
  let cfg = defaultsCache.get(id);
  if (!cfg) {
    const tuning = REALMS_TUNING[id];
    if (!tuning) throw new Error(`Missing calibration for ${id}`);
    cfg = buildRealmsDefaults(getRealmsGame(id), tuning);
    defaultsCache.set(id, cfg);
  }
  return structuredClone(cfg);
}

/** Validate stored or edited JSON for a title against its own defaults and board. */
export function normalizeRealmsGameConfig(id: string, raw: unknown): RealmsConfig {
  const def = getRealmsGame(id);
  return normalizeRealmsConfig(raw, realmsDefaultConfig(id), realmsCells(def));
}

function formatMult(n: number) {
  return `${n.toLocaleString("en-US")}x`;
}

/** Lobby catalog rows for the family (appended to slotGames). */
export const REALMS_SLOT_GAMES: SlotGame[] = REALMS_GAMES.map((def) => ({
  id: def.id,
  name: def.name,
  provider: "MaxHigh",
  thumb: `/games/${def.id}.webp`,
  category: "slot",
  tag: "New",
  description: def.description,
  // No player reviews yet — GameModal hides the rating row when reviews is 0.
  rating: 0,
  reviews: 0,
  rtp: `${(TARGET_RTP * 100).toFixed(1)}%`,
  volatility: def.volatility,
  maxWin: formatMult(PROFILES[def.volatility].maxWinMult),
  minBet: "₱0.20",
  maxBet: "₱100",
  features: ["Cascading Wins", "Free Spins", "Buy Bonus", "Adjustable Qty", "Multipliers"],
}));

/** Most free spins one Buy Bonus can purchase — never above the FS session cap. */
export function realmsBuyMaxQuantity(cfg: RealmsConfig): number {
  return cfg.maxFsSessionSpins > 0 ? Math.min(50, cfg.maxFsSessionSpins) : 50;
}

/**
 * Buy Bonus price per free spin (× bet) for a purchase of `quantity` spins.
 *
 * The feature multiplier applies once per session, so a spin is worth more in
 * a longer session. The measured curve (./buy-curve.ts) gives the fair price at
 * each quantity; superadmin's buyFeatureMult is the price at the standard award
 * and scales the whole curve.
 */
export function realmsBuyPricePerSpin(id: string, cfg: RealmsConfig, quantity: number): number {
  const def = getRealmsGame(id);
  const curve = REALMS_BUY_CURVE[id];
  if (!curve?.length) return cfg.buyFeatureMult;
  const at = (q: number) => curve[Math.min(curve.length, Math.max(1, Math.round(q))) - 1]!;
  const scale = cfg.buyFeatureMult / at(def.freeSpins);
  return Math.round(at(quantity) * scale * 100) / 100;
}
