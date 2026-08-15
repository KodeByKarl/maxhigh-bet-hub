import type { LanternLuckConfig } from "@/lib/lantern-luck-config";
import type { CnyRng } from "./rng";
import type { DragonBonusResult, DragonLaunch } from "./types";

/**
 * Dragon Fireworks mini-game: launch until bust (or soft max launches).
 * Each success awards coins from the weighted firework paytable.
 */
export function resolveDragonFireworks(
  rng: CnyRng,
  totalBet: number,
  cfg: LanternLuckConfig,
): DragonBonusResult {
  const launches: DragonLaunch[] = [];
  let totalCoins = 0;
  let busted = false;

  for (let i = 0; i < cfg.dragonMaxLaunches; i++) {
    const success = rng.chance(cfg.dragonSuccessChancePercent);
    if (!success) {
      launches.push({
        index: i,
        success: false,
        awardId: null,
        awardLabel: null,
        mult: 0,
        coins: 0,
      });
      busted = true;
      break;
    }

    const award = rng.pickWeighted(cfg.dragonFireworkAwards);
    const coins = +(award.mult * totalBet).toFixed(2);
    launches.push({
      index: i,
      success: true,
      awardId: award.id,
      awardLabel: award.label,
      mult: award.mult,
      coins,
    });
    totalCoins += coins;
  }

  if (!busted && launches.length >= cfg.dragonMaxLaunches) {
    busted = true;
  }

  return {
    triggered: true,
    launches,
    totalCoins: +totalCoins.toFixed(2),
    busted,
  };
}
