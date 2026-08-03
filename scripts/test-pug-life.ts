/**
 * Pug Life — regression tests + optional RTP simulation.
 * Run: npx tsx scripts/test-pug-life.ts
 * RTP:  npx tsx scripts/test-pug-life.ts --rtp 100000
 */
import {
  DEFAULT_PUG_LIFE_CONFIG,
  isBonusBuyAllowed,
  normalizePugLifeConfig,
  type PugLifeConfig,
} from "../src/lib/pug-life-config";
import {
  combineWildMultipliers,
  applyCombinedWildMultiplier,
} from "../src/lib/slot-primitives/combinedWildMultipliers";
import {
  addToPool,
  createPooledPayout,
  settlePool,
} from "../src/lib/slot-primitives/pooledPayout";
import { evaluatePaylines } from "../src/components/maxhigh/pug-life/paylineEngine";
import { generateGrid, countTreats } from "../src/components/maxhigh/pug-life/reelGenerator";
import { createRng } from "../src/components/maxhigh/pug-life/rng";
import { setPugLifeConfig } from "../src/components/maxhigh/pug-life/runtimeConfig";
import { resolvePugLifeSpin, resolvePugLifeBuy } from "../src/components/maxhigh/pug-life/spinResolver";
import { validateBonusBuy } from "../src/components/maxhigh/pug-life/buyFeature";
import {
  shouldTriggerTreatYoSelf,
  resolveTreatYoSelfSession,
} from "../src/components/maxhigh/pug-life/treatYoSelf";
import {
  shouldTriggerDawgsDen,
  resolveDawgsDenSession,
} from "../src/components/maxhigh/pug-life/dawgsDen";
import type { PlCell, PlGrid } from "../src/components/maxhigh/pug-life/types";

setPugLifeConfig(DEFAULT_PUG_LIFE_CONFIG);
const cfg = DEFAULT_PUG_LIFE_CONFIG;
const BET = 10; // total stake for ways math
const HEIGHTS = cfg.reelHeights;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function cell(kind: PlCell["kind"], treatMult?: number): PlCell {
  return treatMult != null ? { kind, treatMult } : { kind };
}

/** Build diamond grid: each column length must match reelHeights. */
function gridFrom(cols: PlCell["kind"][][]): PlGrid {
  assert(cols.length === HEIGHTS.length, `expected ${HEIGHTS.length} reels`);
  return cols.map((col, i) => {
    assert(col.length === HEIGHTS[i], `reel ${i} height ${HEIGHTS[i]}, got ${col.length}`);
    return col.map((k) => cell(k));
  });
}

function fillCol(height: number, kind: PlCell["kind"], treatMult?: number): PlCell[] {
  return Array.from({ length: height }, () => cell(kind, treatMult));
}

function runUnitTests() {
  console.log("==========================================");
  console.log("Pug Den — unit / regression tests (diamond ways)");
  console.log("==========================================");

  // --- Section 1: config + grid ---
  const normalized = normalizePugLifeConfig(null);
  assert(normalized.reelsCount === 7, "7 reels");
  assert(normalized.reelHeights.join("-") === "1-2-3-4-3-2-1", "diamond heights");
  assert(normalized.paylineCount === 144, "144 connecting ways");
  assert(normalized.maxWinMult === 7_500, "maxWinMult 7500");
  assert(normalized.minBet === 0.1 && normalized.maxBet === 100, "bet range");

  // Legacy 5×4 configs migrate to diamond
  const migrated = normalizePugLifeConfig({ reelsCount: 5, rowsCount: 4, paylineCount: 16 });
  assert(migrated.reelHeights.join("-") === "1-2-3-4-3-2-1", "legacy migrate");

  const rng = createRng("pl-grid-test");
  const g = generateGrid(rng, cfg, { context: "base" });
  assert(
    g.length === 7 && g.every((c, i) => c.length === HEIGHTS[i]),
    "generateGrid diamond",
  );

  // Toaster never in base
  for (const col of g) {
    for (const c of col) assert(c.kind !== "toaster", "no toaster in base game");
  }

  // Dawg's Den: toaster only reels 3,4
  let toasterSeenWrongReel = false;
  for (let i = 0; i < 200; i++) {
    const gg = generateGrid(createRng(`pl-dd-${i}`), cfg, { context: "dawgs_den" });
    for (let reel = 0; reel < 7; reel++) {
      for (const c of gg[reel]) {
        if (c.kind === "toaster" && ![3, 4].includes(reel)) toasterSeenWrongReel = true;
      }
    }
  }
  assert(!toasterSeenWrongReel, "toaster only on center reels 3/4");
  console.log("✓ Section 1: config + diamond grid + toaster restriction");

  // --- Section 2: connecting ways ---
  const dead: PlGrid = gridFrom([
    ["sym_10"],
    ["sym_j", "sym_q"],
    ["sym_k", "sym_a", "rat"],
    ["pigeon", "cat", "chihuahua", "pug"],
    ["sym_10", "sym_j", "sym_q"],
    ["sym_k", "sym_a"],
    ["rat"],
  ]);
  const deadEval = evaluatePaylines(dead, BET, cfg);
  assert(deadEval.total === 0, `Expected no-win, got ${deadEval.total}`);
  console.log("✓ No-win ways eval");

  // 5 consecutive reels of pug (reels 0–4)
  const pugFive: PlGrid = [
    fillCol(1, "pug"),
    fillCol(2, "pug"),
    fillCol(3, "pug"),
    fillCol(4, "pug"),
    fillCol(3, "pug"),
    fillCol(2, "sym_j"),
    fillCol(1, "sym_q"),
  ];
  const pugEval = evaluatePaylines(pugFive, BET, cfg);
  const pugWin = pugEval.wins.find((w) => w.symbol === "pug");
  const pugPay = cfg.symbols.find((s) => s.kind === "pug")!.pay[2];
  // ways = 1*2*3*4*3 = 72
  const expectedWays = 1 * 2 * 3 * 4 * 3;
  assert(!!pugWin && pugWin.count === 5, "pug 5 consecutive reels");
  assert(pugWin!.waysCount === expectedWays, `pug ways ${expectedWays} got ${pugWin!.waysCount}`);
  assert(
    Math.abs(pugWin!.basePayout - pugPay * BET * expectedWays) < 0.05,
    "pug base payout = pay × bet × ways",
  );
  console.log(`✓ Ways pug 5-oak = ${pugWin!.payout} (${expectedWays} ways)`);

  // 3 consecutive on leftmost reels only (heights 1,2,3 → 6 ways)
  const threeOak: PlGrid = [
    fillCol(1, "sym_a"),
    fillCol(2, "sym_a"),
    fillCol(3, "sym_a"),
    fillCol(4, "pug"),
    fillCol(3, "rat"),
    fillCol(2, "cat"),
    fillCol(1, "pigeon"),
  ];
  for (const stake of [1, 10]) {
    const ev = evaluatePaylines(threeOak, stake, cfg);
    const win = ev.wins.find((w) => w.symbol === "sym_a");
    assert(!!win && win.count === 3, `3-oak at stake ${stake}`);
    assert(win!.waysCount === 6, "1×2×3 = 6 ways");
    const expected = cfg.symbols.find((s) => s.kind === "sym_a")!.pay[0] * stake * 6;
    assert(Math.abs(win!.payout - expected) < 0.02, `3-oak payout stake ${stake}`);
  }
  console.log("✓ Section 2: connecting ways + stake scaling");

  // --- Section 3: Treat Wild multiplier combination ---
  assert(combineWildMultipliers([]) === 1, "empty → identity 1");
  assert(combineWildMultipliers([{ position: [0, 0], multiplier: 3 }]) === 3, "single");
  assert(
    combineWildMultipliers([
      { position: [0, 0], multiplier: 3 },
      { position: [1, 0], multiplier: 5 },
    ]) === 8,
    "sum 3+5=8",
  );
  const applied = applyCombinedWildMultiplier(10, [
    { position: [0, 0], multiplier: 2 },
    { position: [1, 0], multiplier: 4 },
  ]);
  assert(applied.combinedMult === 6 && applied.payout === 60, "10 × (2+4) = 60");

  // Treat substitutes on pug ways (reel 0 treat, reels 1-4 pug)
  const oneTreat: PlGrid = [
    [cell("treat_biscuit", 3)],
    fillCol(2, "pug"),
    fillCol(3, "pug"),
    fillCol(4, "pug"),
    fillCol(3, "pug"),
    fillCol(2, "sym_j"),
    fillCol(1, "sym_q"),
  ];
  const oneEv = evaluatePaylines(oneTreat, BET, cfg);
  const oneW = oneEv.wins.find((w) => w.symbol === "pug");
  assert(!!oneW && oneW.combinedTreatMult === 3, "single Treat mult 3");
  assert(Math.abs(oneW!.payout - oneW!.basePayout * 3) < 0.05, "single Treat applied");

  // Two Treats — sum
  const twoTreat: PlGrid = [
    [cell("treat_biscuit", 3)],
    [cell("treat_bone", 5), cell("treat_bone", 5)],
    fillCol(3, "pug"),
    fillCol(4, "pug"),
    fillCol(3, "pug"),
    fillCol(2, "sym_j"),
    fillCol(1, "sym_q"),
  ];
  const twoEv = evaluatePaylines(twoTreat, BET, cfg);
  const twoW = twoEv.wins.find((w) => w.symbol === "pug");
  // treat contributions: reel0 one×3 + reel1 two×5 = 3+5+5 = 13
  assert(!!twoW && twoW.combinedTreatMult === 13, `combined got ${twoW?.combinedTreatMult}`);

  // Five Treat consecutive reels → fiveTreatWin
  const fiveTreat: PlGrid = [
    [cell("treat_biscuit", 2)],
    [cell("treat_biscuit", 2), cell("treat_biscuit", 2)],
    [cell("treat_bone", 5), cell("treat_bone", 5), cell("treat_bone", 5)],
    [
      cell("treat_bone", 5),
      cell("treat_bone", 5),
      cell("treat_bone", 5),
      cell("treat_bone", 5),
    ],
    [cell("treat_steak", 25), cell("treat_steak", 25), cell("treat_steak", 25)],
    fillCol(2, "sym_j"),
    fillCol(1, "sym_q"),
  ];
  const fiveEv = evaluatePaylines(fiveTreat, BET, cfg);
  const fiveW = fiveEv.wins.find((w) => w.fiveTreatWin);
  assert(!!fiveW?.fiveTreatWin, "five Treat win flag");
  assert(fiveW!.count >= 5, "5+ consecutive treat reels");
  console.log("✓ Section 3: Treat multiplier combination");

  // --- Section 4: Treat Yo'Self ---
  const triggerGrid: PlGrid = [
    [cell("treat_biscuit", 2)],
    [cell("treat_bone", 5), cell("sym_10")],
    [cell("treat_steak", 25), cell("sym_10"), cell("sym_j")],
    fillCol(4, "sym_a"),
    fillCol(3, "rat"),
    fillCol(2, "pug"),
    fillCol(1, "sym_k"),
  ];
  const tysTrig = shouldTriggerTreatYoSelf(triggerGrid, cfg);
  assert(tysTrig.triggered && tysTrig.positions.length === 3, "Treat Yo'Self trigger 3+");

  const tysSession = resolveTreatYoSelfSession({
    rng: createRng("pl-tys-session"),
    totalBet: BET,
    triggerGrid,
    triggerPositions: tysTrig.positions,
    cfg,
  });
  assert(tysSession.type === "treat_yoself", "session type");
  assert(tysSession.steps.length > 0, "has steps");
  for (const step of tysSession.steps) {
    for (const [reel, row] of tysTrig.positions) {
      assert(
        step.grid[reel][row].sticky === true ||
          step.grid[reel][row].kind.startsWith("treat_"),
        "trigger treats stay sticky",
      );
    }
  }
  const endedByLives = tysSession.steps.some((s) => s.livesRemainingAfter === 0);
  const endedBySpins = tysSession.steps[tysSession.steps.length - 1]?.spinsRemainingAfter === 0;
  assert(endedByLives || endedBySpins, "session terminates via lives or spins");
  console.log(
    `✓ Section 4: Treat Yo'Self (${tysSession.steps.length} steps, win=${tysSession.totalWin})`,
  );

  // --- Section 5: Dawg's Den pooled payout ---
  const pool = createPooledPayout();
  const p1 = addToPool(pool, { source: "payline", amount: 10, spinIndex: 0 });
  const p2 = addToPool(p1, { source: "toaster_cash", amount: 5, spinIndex: 1 });
  assert(p2.pot === 15, "pot accumulates");
  const settled = settlePool(p2);
  assert(settled.settled && settled.settledAmount === 15, "lump-sum settle");
  let threw = false;
  try {
    addToPool(settled, { source: "x", amount: 1 });
  } catch {
    threw = true;
  }
  assert(threw, "cannot add after settle");

  const scatterGrid: PlGrid = [
    [cell("scatter")],
    [cell("scatter"), cell("sym_10")],
    [cell("scatter"), cell("sym_10"), cell("sym_j")],
    fillCol(4, "sym_a"),
    fillCol(3, "rat"),
    fillCol(2, "pug"),
    fillCol(1, "sym_k"),
  ];
  const ddTrig = shouldTriggerDawgsDen(scatterGrid, cfg);
  assert(ddTrig.triggered, "Dawg's Den trigger");

  const ddSession = resolveDawgsDenSession({
    rng: createRng("pl-dd-session"),
    totalBet: BET,
    scatterPositions: ddTrig.positions,
    cfg,
  });
  assert(ddSession.type === "dawgs_den", "dd type");
  assert(ddSession.pool.settled === true, "pool settled at end");
  assert(ddSession.totalWin === ddSession.pool.settledAmount, "lump sum = pot");
  for (const step of ddSession.steps) {
    assert(typeof step.potAfter === "number", "pot tracked per step");
  }
  console.log(
    `✓ Section 5: Dawg's Den pooled (FS=${ddSession.freeSpinsAwarded}, pot=${ddSession.totalWin})`,
  );

  // --- Section 6: bonus buy + UK gating ---
  assert(isBonusBuyAllowed("US", cfg) === true, "US allowed");
  assert(isBonusBuyAllowed("UK", cfg) === false, "UK blocked");
  assert(isBonusBuyAllowed("GB", cfg) === false, "GB blocked");
  assert(isBonusBuyAllowed("uk", cfg) === false, "uk case-insensitive");

  const ukBuy = validateBonusBuy({
    buyId: "featurespins",
    totalBet: BET,
    marketCode: "UK",
    cfg,
  });
  assert(!ukBuy.ok, "UK featurespins blocked");

  const fsBuy = validateBonusBuy({
    buyId: "featurespins",
    totalBet: BET,
    marketCode: "PH",
    cfg,
  });
  assert(fsBuy.ok && fsBuy.cost === BET * 3, "featurespins 3× cost");

  const tysBuy = validateBonusBuy({
    buyId: "treat_yoself",
    totalBet: BET,
    marketCode: "PH",
    cfg,
  });
  assert(tysBuy.ok && tysBuy.cost === BET * 100, "treat_yoself provisional 100× cost");

  const ddBuy = validateBonusBuy({
    buyId: "dawgs_den",
    totalBet: BET,
    marketCode: "PH",
    cfg,
  });
  assert(ddBuy.ok && ddBuy.cost === BET * 200, "dawgs_den provisional 200× cost");

  const blockedCfg: PugLifeConfig = {
    ...cfg,
    buyOptions: cfg.buyOptions.map((b) =>
      b.id === "treat_yoself" ? { ...b, costMult: 0 } : b,
    ),
  };
  const blocked = validateBonusBuy({
    buyId: "treat_yoself",
    totalBet: BET,
    marketCode: "PH",
    cfg: blockedCfg,
  });
  assert(!blocked.ok, "costMult=0 still blocks buy");

  setPugLifeConfig(cfg);
  const buyTys = resolvePugLifeBuy({
    buyId: "treat_yoself",
    totalBet: BET,
    marketCode: "PH",
    seed: "buy-tys",
  });
  assert(buyTys.cost === BET * 100, "tys buy cost");
  assert(buyTys.script.treatYoSelfTriggered, "tys buy enters session");
  assert(buyTys.script.bonusSession?.type === "treat_yoself", "tys session");

  const buyDd = resolvePugLifeBuy({
    buyId: "dawgs_den",
    totalBet: BET,
    marketCode: "PH",
    seed: "buy-dd",
  });
  assert(buyDd.cost === BET * 200, "dd buy cost");
  assert(buyDd.script.dawgsDenTriggered, "dd buy enters session");

  let ukThrew = false;
  try {
    resolvePugLifeBuy({ buyId: "treat_yoself", totalBet: BET, marketCode: "UK" });
  } catch {
    ukThrew = true;
  }
  assert(ukThrew, "UK buy throws");
  setPugLifeConfig(DEFAULT_PUG_LIFE_CONFIG);
  console.log("✓ Section 6: bonus buy + UK jurisdiction gating");

  // --- Section 7: max-win cap ---
  const huge: PlGrid = [
    [cell("treat_steak", 200)],
    [cell("treat_steak", 200), cell("treat_steak", 200)],
    [cell("treat_steak", 200), cell("treat_steak", 200), cell("treat_steak", 200)],
    [
      cell("treat_steak", 200),
      cell("treat_steak", 200),
      cell("treat_steak", 200),
      cell("treat_steak", 200),
    ],
    [cell("treat_steak", 200), cell("treat_steak", 200), cell("treat_steak", 200)],
    [cell("treat_steak", 200), cell("treat_steak", 200)],
    [cell("treat_steak", 200)],
  ];
  const capped = resolvePugLifeSpin({ totalBet: BET, seed: "cap", grid: huge });
  assert(capped.totalWin <= cfg.maxWinMult * BET + 0.01, "capped at 7500×");
  if (capped.rawTotalWin > cfg.maxWinMult * BET) {
    assert(capped.hitCap === true, "hitCap flag");
  }
  console.log(
    `✓ Section 7: max-win cap (raw=${capped.rawTotalWin}, total=${capped.totalWin}, hitCap=${capped.hitCap})`,
  );

  // Full resolve smoke
  const smoke = resolvePugLifeSpin({ totalBet: BET, seed: "smoke-1" });
  assert(!!smoke.seed && smoke.grid.length === 7, "smoke resolve 7 reels");
  assert(
    smoke.grid.every((c, i) => c.length === HEIGHTS[i]),
    "smoke diamond heights",
  );
  assert(smoke.audit.seed === smoke.seed, "audit seed");
  console.log("✓ Full spin resolve smoke");

  console.log("==========================================");
  console.log("All Pug Den unit tests passed");
  console.log("==========================================");
}

function runRtp(spins: number) {
  console.log(`\nRTP simulation — ${spins.toLocaleString()} base spins @ bet ${BET}`);
  setPugLifeConfig(DEFAULT_PUG_LIFE_CONFIG);
  let wagered = 0;
  let won = 0;
  let baseOnly = 0;
  let tysWin = 0;
  let ddWin = 0;
  let tys = 0;
  let dd = 0;
  let hits = 0;
  for (let i = 0; i < spins; i++) {
    const s = resolvePugLifeSpin({ totalBet: BET, seed: `rtp-${i}` });
    wagered += BET;
    won += s.totalWin;
    if (s.totalWin > 0) hits++;
    if (s.treatYoSelfTriggered) {
      tys++;
      tysWin += s.bonusSession?.totalWin ?? 0;
      baseOnly += s.paylineWin;
    } else if (s.dawgsDenTriggered) {
      dd++;
      ddWin += s.bonusSession?.totalWin ?? 0;
      baseOnly += s.paylineWin;
    } else {
      baseOnly += s.totalWin;
    }
  }
  const rtp = (won / wagered) * 100;
  console.log(`  Wagered: ${wagered.toFixed(2)}`);
  console.log(`  Won:     ${won.toFixed(2)}`);
  console.log(`  RTP:     ${rtp.toFixed(3)}%  (target ~96.33% — tune weights)`);
  console.log(`  Hit rate:${((hits / spins) * 100).toFixed(2)}%`);
  console.log(`  Base contrib RTP: ${((baseOnly / wagered) * 100).toFixed(2)}%`);
  console.log(`  TYS contrib RTP:  ${((tysWin / wagered) * 100).toFixed(2)}% (${tys} trig)`);
  console.log(`  DD contrib RTP:   ${((ddWin / wagered) * 100).toFixed(2)}% (${dd} trig)`);
}

runUnitTests();

const rtpArg = process.argv.indexOf("--rtp");
if (rtpArg >= 0) {
  const n = Number(process.argv[rtpArg + 1] ?? 100_000);
  runRtp(Number.isFinite(n) && n > 0 ? Math.floor(n) : 100_000);
}
