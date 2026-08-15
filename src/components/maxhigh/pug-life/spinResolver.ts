/**
 * Pug Den — server-authoritative full spin / session resolution.
 *
 * Base spin order:
 * 1. Generate 3-4-5-4-3 diamond grid (720 connecting ways)
 * 2. Evaluate connecting ways (+ Treat mult combination)
 * 3. Check Treat Yo'Self trigger (3+ Treats)
 * 4. Check Dawg's Den trigger (3+ Scatters)
 * 5. Resolve dual-trigger via config priority
 * 6. Sum base + bonus, apply 7,500× max-win cap
 * 7. Return full auditable script for frontend playback
 */

import { betPerLine, type PlRtpProfileId, type PugLifeConfig } from "@/lib/pug-life-config";
import { validateBonusBuy } from "./buyFeature";
import {
  awardFreeSpinsFromScatters,
  resolveDawgsDenSession,
  shouldTriggerDawgsDen,
} from "./dawgsDen";
import { evaluatePaylines } from "./paylineEngine";
import {
  collectTreatAudit,
  countScatters,
  countTreats,
  generateGrid,
} from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getPugLifeConfig } from "./runtimeConfig";
import {
  resolveTreatYoSelfSession,
  shouldTriggerTreatYoSelf,
} from "./treatYoSelf";
import type { BonusBuyMeta, PlGrid, SpinScript } from "./types";
import { gridKinds } from "./types";

export type ResolvePugLifeSpinOpts = {
  totalBet: number;
  seed?: string;
  /** Fixed grid for unit tests. */
  grid?: PlGrid;
  entryPath?: SpinScript["entryPath"];
  marketCode?: string | null;
  /** Direct-buy: skip normal trigger and enter the named bonus. */
  forceBonus?: "treat_yoself" | "dawgs_den" | null;
  /** For featurespins batch tracking (UI). */
  featurespinsRemaining?: number;
  /** Override config (tests). Defaults to runtime singleton. */
  cfg?: PugLifeConfig;
};

function withProfile(cfg: PugLifeConfig, profileId: PlRtpProfileId): PugLifeConfig {
  return { ...cfg, activeRtpProfile: profileId };
}

function applyCap(
  rawTotalWin: number,
  totalBet: number,
  cfg: PugLifeConfig,
): { totalWin: number; hitCap: boolean } {
  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(maxPayout) && rawTotalWin > maxPayout) {
    return { totalWin: maxPayout, hitCap: true };
  }
  return { totalWin: rawTotalWin, hitCap: false };
}

/**
 * Resolve one paid spin (or buy-entry session) into a full SpinScript.
 */
export function resolvePugLifeSpin(opts: ResolvePugLifeSpinOpts): SpinScript {
  let cfg = opts.cfg ?? getPugLifeConfig();
  const totalBet = opts.totalBet;
  const seed = opts.seed ?? newSpinSeed("pl");
  const rng = createRng(seed);
  const entryPath = opts.entryPath ?? "base";

  // Select reel profile for entry path (local only — do not mutate global runtime)
  if (entryPath === "featurespins") {
    cfg = withProfile(cfg, "featurespins");
  } else if (entryPath === "buy_treat_yoself") {
    cfg = withProfile(cfg, "buy_treat_yoself");
  } else if (entryPath === "buy_dawgs_den") {
    cfg = withProfile(cfg, "buy_dawgs_den");
  }

  let buyMeta: BonusBuyMeta | null = null;
  const forceBonus = opts.forceBonus ?? null;

  if (forceBonus === "treat_yoself" || entryPath === "buy_treat_yoself") {
    const v = validateBonusBuy({
      buyId: "treat_yoself",
      totalBet,
      marketCode: opts.marketCode,
      cfg,
    });
    // For resolution tests we may force without purchase validation;
    // server layer must call validateBonusBuy before debiting.
    if (v.ok) {
      buyMeta = {
        option: "treat_yoself",
        costMult: v.option.costMult,
        cost: v.cost,
        marketCode: opts.marketCode ?? null,
      };
    }
  } else if (forceBonus === "dawgs_den" || entryPath === "buy_dawgs_den") {
    const v = validateBonusBuy({
      buyId: "dawgs_den",
      totalBet,
      marketCode: opts.marketCode,
      cfg,
    });
    if (v.ok) {
      buyMeta = {
        option: "dawgs_den",
        costMult: v.option.costMult,
        cost: v.cost,
        marketCode: opts.marketCode ?? null,
      };
    }
  } else if (entryPath === "featurespins") {
    const v = validateBonusBuy({
      buyId: "featurespins",
      totalBet,
      marketCode: opts.marketCode,
      cfg,
    });
    if (v.ok) {
      buyMeta = {
        option: "featurespins",
        costMult: v.option.costMult,
        cost: v.cost,
        marketCode: opts.marketCode ?? null,
      };
    }
  }

  const context =
    entryPath === "featurespins"
      ? "featurespins"
      : ("base" as const);

  const grid =
    opts.grid ??
    generateGrid(rng, cfg, {
      context: forceBonus ? "base" : context,
    });

  const { wins: paylineWins, total: paylineWin } = evaluatePaylines(grid, totalBet, cfg);
  const treats = countTreats(grid);
  const scatters = countScatters(grid, cfg);

  let treatYoSelfTriggered = false;
  let dawgsDenTriggered = false;
  let bonusSession: SpinScript["bonusSession"] = null;

  const buildTreatSession = (): NonNullable<SpinScript["bonusSession"]> => {
    const trigger = shouldTriggerTreatYoSelf(grid, cfg);
    const positions =
      forceBonus === "treat_yoself" || entryPath === "buy_treat_yoself"
        ? trigger.positions.length > 0
          ? trigger.positions
          : ([] as Array<[number, number]>)
        : trigger.positions;
    return resolveTreatYoSelfSession({
      rng,
      totalBet,
      triggerGrid: grid,
      triggerPositions: positions,
      cfg,
    });
  };

  const buildDawgsSession = (): NonNullable<SpinScript["bonusSession"]> => {
    const trigger = shouldTriggerDawgsDen(grid, cfg);
    const positions =
      forceBonus === "dawgs_den" || entryPath === "buy_dawgs_den"
        ? trigger.positions.length >= cfg.dawgsDen.triggerScatterCount
          ? trigger.positions
          : (Array.from({ length: cfg.dawgsDen.triggerScatterCount }, (_, i) => [
              i % cfg.reelsCount,
              0,
            ]) as Array<[number, number]>)
        : trigger.positions;

    const rolled = awardFreeSpinsFromScatters(rng, positions.length, cfg);
    return resolveDawgsDenSession({
      rng,
      totalBet,
      scatterPositions: positions,
      freeSpins: rolled.total,
      scatterAwards: rolled.awards,
      cfg,
    });
  };

  // Direct buy paths skip normal trigger checks
  if (forceBonus === "treat_yoself" || entryPath === "buy_treat_yoself") {
    treatYoSelfTriggered = true;
    bonusSession = buildTreatSession();
  } else if (forceBonus === "dawgs_den" || entryPath === "buy_dawgs_den") {
    dawgsDenTriggered = true;
    bonusSession = buildDawgsSession();
  } else {
    const tys = shouldTriggerTreatYoSelf(grid, cfg);
    const dd = shouldTriggerDawgsDen(grid, cfg);

    if (tys.triggered && dd.triggered) {
      // TODO/config-pending — dual trigger priority
      if (cfg.dualTriggerPriority === "dawgs_den") {
        dawgsDenTriggered = true;
        bonusSession = buildDawgsSession();
      } else {
        // treat_yoself (default) or both_sequential (deferred → prefer TYS)
        treatYoSelfTriggered = true;
        bonusSession = buildTreatSession();
      }
    } else if (tys.triggered) {
      treatYoSelfTriggered = true;
      bonusSession = buildTreatSession();
    } else if (dd.triggered) {
      dawgsDenTriggered = true;
      bonusSession = buildDawgsSession();
    }
  }

  const bonusWin = bonusSession ? bonusSession.totalWin : 0;
  // For Dawg's Den: base payline wins during trigger spin are typically paid,
  // then pot settles at end. Include both.
  // For Treat Yo'Self: base win + session total (per-spin sums).
  const rawTotalWin = +(paylineWin + bonusWin).toFixed(2);
  const { totalWin, hitCap } = applyCap(rawTotalWin, totalBet, cfg);

  const potFinal =
    bonusSession && bonusSession.type === "dawgs_den"
      ? bonusSession.pool.settledAmount
      : undefined;

  return {
    seed,
    totalBet,
    betPerLine: betPerLine(totalBet, cfg),
    entryPath:
      forceBonus === "treat_yoself"
        ? "buy_treat_yoself"
        : forceBonus === "dawgs_den"
          ? "buy_dawgs_den"
          : entryPath,
    grid,
    paylineWins,
    paylineWin,
    treatCount: treats.count,
    scatterCount: scatters.count,
    treatYoSelfTriggered,
    dawgsDenTriggered,
    bonusSession,
    buyMeta,
    featurespinsRemaining: opts.featurespinsRemaining,
    rawTotalWin,
    totalWin: +totalWin.toFixed(2),
    hitCap,
    audit: {
      seed,
      symbols: gridKinds(grid),
      treatMults: collectTreatAudit(grid),
      potFinal,
    },
  };
}

/**
 * Resolve a direct bonus buy (validates cost + jurisdiction first).
 * Throws if buy is not allowed.
 */
export function resolvePugLifeBuy(opts: {
  buyId: "featurespins" | "treat_yoself" | "dawgs_den";
  totalBet: number;
  marketCode?: string | null;
  seed?: string;
}): { cost: number; script: SpinScript } {
  const cfg = getPugLifeConfig();
  const v = validateBonusBuy({
    buyId: opts.buyId,
    totalBet: opts.totalBet,
    marketCode: opts.marketCode,
    cfg,
  });
  if (!v.ok) throw new Error(v.reason);

  if (opts.buyId === "featurespins") {
    const script = resolvePugLifeSpin({
      totalBet: opts.totalBet,
      seed: opts.seed,
      entryPath: "featurespins",
      marketCode: opts.marketCode,
      featurespinsRemaining: cfg.featurespinsBatchSize - 1,
    });
    return { cost: v.cost, script };
  }

  const force = opts.buyId === "treat_yoself" ? "treat_yoself" : "dawgs_den";
  const script = resolvePugLifeSpin({
    totalBet: opts.totalBet,
    seed: opts.seed,
    entryPath: opts.buyId === "treat_yoself" ? "buy_treat_yoself" : "buy_dawgs_den",
    marketCode: opts.marketCode,
    forceBonus: force,
  });
  return { cost: v.cost, script };
}
