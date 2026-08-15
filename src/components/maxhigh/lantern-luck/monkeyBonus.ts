import {
  payingSymbolKinds,
  type LanternLuckConfig,
  type CnySymKind,
} from "@/lib/lantern-luck-config";
import type { CnyRng } from "./rng";
import type { MonkeyBonusResult } from "./types";

/**
 * Monkey Free Spins trigger: immediate ×bet payout + Extra Scatter wheel pick.
 */
export function resolveMonkeyTrigger(
  rng: CnyRng,
  totalBet: number,
  cfg: LanternLuckConfig,
): MonkeyBonusResult {
  const pool = payingSymbolKinds(cfg);
  const pick = pool[rng.nextInt(pool.length)] ?? "lantern";
  return {
    triggered: true,
    triggerPayout: +(cfg.monkeyTriggerMult * totalBet).toFixed(2),
    extraScatterSymbol: pick as CnySymKind,
    freeSpinsAwarded: cfg.freeSpinsAward,
  };
}
