import assert from "node:assert/strict";
import { DEFAULT_WILD_PANTHER_CONFIG } from "../src/lib/wild-panther-config";
import {
  getRuntimeSymbols,
  getWildPantherConfig,
  setWildPantherConfig,
} from "../src/components/maxhigh/wild-panther/runtimeConfig";
import { payForCount } from "../src/components/maxhigh/wild-panther/paytable";
import { resolveSpin } from "../src/components/maxhigh/wild-panther/spinResolver";
import { CELLS } from "../src/components/maxhigh/wild-panther/types";

const runtime = globalThis as typeof globalThis & { __maxhighRandom?: () => number };
const previousRandom = runtime.__maxhighRandom;
const previousConfig = structuredClone(getWildPantherConfig());
let checks = 0;
try {
  // Each refill has CELLS draws for symbols and CELLS for the (disabled) bomb
  // chance. Keep 40 winning boards; introduce scatters ONLY in the last refill.
  setWildPantherConfig({
    ...DEFAULT_WILD_PANTHER_CONFIG,
    bombChanceBasePercent: 0,
    bombChanceFreeSpinsPercent: 0,
    symbols: DEFAULT_WILD_PANTHER_CONFIG.symbols.map((symbol) => ({
      ...symbol,
      weight: symbol.kind === "grape" || symbol.scatter ? 1 : 0,
    })),
  });
  const symbols = getRuntimeSymbols();
  const pay = symbols.find((symbol) => symbol.kind === "grape")!;
  const scatter = symbols.find((symbol) => symbol.scatter)!;
  // Tumble refills never spawn scatters (calibrated Panther family rule): even if the RNG picks the scatter symbol on every
  // refill it becomes a pay symbol, so only OPENING-board scatters can trigger or retrigger.
  for (const free of [false, true]) {
    runtime.__maxhighRandom = () => 0.75; // always lands on the scatter band
    const result = resolveSpin({
      bet: 1,
      ante: false,
      isFreeSpins: free,
      forceBoard: Array.from({ length: CELLS }, (_, i) => ({ key: `forced-${i}`, sym: pay })),
    });
    assert.equal(result.steps.length, 40, "Exercise the actual production tumble guard");
    assert.ok(
      result.steps.every((step) => step.afterFall.every((cell) => !cell.sym.scatter)),
      "no scatter may spawn in a refill",
    );
    assert.equal(result.scatters, 0);
    assert.equal(result.freeSpinsAwarded, 0);
    assert.equal(result.retriggerSpins, 0);
    checks++;
  }
  // Opening-board scatters are counted, award and cash tiers follow config.
  const mixed = ["grape", "plum", "melon", "apple", "blue", "green", "purple", "heart"].map(
    (k) => symbols.find((s) => s.kind === k) ?? pay,
  );
  for (const [free, count] of [
    [false, 4],
    [false, 3],
    [true, 3],
    [true, 7],
  ] as const) {
    runtime.__maxhighRandom = () => {
      throw Error("No random draws expected without a winning cluster");
    };
    const board = Array.from({ length: CELLS }, (_, i) => ({
      key: `open-${i}`,
      sym: i < count ? scatter : mixed[i % mixed.length],
    }));
    const result = resolveSpin({ bet: 1, ante: false, isFreeSpins: free, forceBoard: board });
    const cfg = getWildPantherConfig();
    assert.equal(result.scatters, count);
    const cash = free
      ? 0
      : ([...cfg.scatterCashTiers].sort((a, b) => b.count - a.count).find((t) => count >= t.count)
          ?.mult ?? 0);
    assert.equal(result.scatterPay, cash);
    assert.equal(
      result.freeSpinsAwarded,
      !free && count >= cfg.freeSpinsTriggerCount ? cfg.freeSpinsBase : 0,
    );
    assert.equal(
      result.retriggerSpins,
      free && count >= cfg.freeSpinsRetriggerCount ? cfg.freeSpinsRetrigger : 0,
    );
    checks++;
  }
  runtime.__maxhighRandom = () => {
    throw Error("No random draws expected without a winning cluster");
  };
  const quiet = resolveSpin({
    bet: 1,
    ante: false,
    isFreeSpins: false,
    forceBoard: Array.from({ length: CELLS }, (_, i) => ({ key: `scatter-${i}`, sym: scatter })),
  });
  assert.equal(quiet.steps.length, 0);
  assert.equal(quiet.scatters, CELLS);
  assert.equal(quiet.freeSpinsAwarded, getWildPantherConfig().freeSpinsBase);
  checks++;

  // A legal high-bomb board can exceed the advertised cap. This must be
  // deterministic rather than relying on a rare random referee hit.
  for (const [free, bet, cap] of [
    [false, 1, 10000],
    [false, 0.23, 25],
    [false, 1, 0],
    [true, 1, 25],
  ] as const) {
    setWildPantherConfig({ ...DEFAULT_WILD_PANTHER_CONFIG, maxWinMult: cap });
    const active = getRuntimeSymbols();
    const heart = active.find((symbol) => symbol.kind === "heart")!;
    const bomb = active.find((symbol) => symbol.bomb)!;
    let draws = 0;
    // Refill exclusively with bombs, so this fixture has exactly one paid tumble.
    runtime.__maxhighRandom = () => {
      draws++;
      return 0;
    };
    const result = resolveSpin({
      bet,
      ante: false,
      isFreeSpins: free,
      forceBoard: Array.from({ length: CELLS }, (_, i) => ({
        key: `cap-${i}`,
        sym: i < 12 ? heart : bomb,
        ...(i < 12 ? {} : { mult: 100 }),
      })),
    });
    const rawCluster = +(bet * payForCount(heart, 12)).toFixed(2);
    const rawTotal = free ? rawCluster : +(rawCluster * (CELLS - 12) * 100).toFixed(2);
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0].tumbleWin, rawTotal, "Original tumble math retained");
    assert.equal(
      result.totalWin,
      cap > 0 ? Math.min(rawTotal, +(bet * cap).toFixed(2)) : rawTotal,
      "Resolver total obeys the configured cap; zero explicitly remains uncapped",
    );
    assert.equal(result.bombAccumulator, free ? (CELLS - 12) * 100 : 0);
    assert.equal(draws, CELLS * 3, "Cap enforcement consumes no extra randomness");
    checks++;
  }
  // Regression: free-spin features must terminate (retrigger branching factor < 1) and respect the hard ceiling.
  setWildPantherConfig(DEFAULT_WILD_PANTHER_CONFIG);
  let seed = 12345;
  runtime.__maxhighRandom = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const dcfg = getWildPantherConfig();
  let retriggers = 0;
  const SAMPLES = 4000;
  for (let i = 0; i < SAMPLES; i++) {
    if (resolveSpin({ bet: 1, ante: false, isFreeSpins: true }).retriggerSpins > 0) retriggers++;
  }
  const branching = (retriggers / SAMPLES) * dcfg.freeSpinsRetrigger;
  assert.ok(
    branching < 0.9,
    `free-spin branching factor must be < 0.9 (got ${branching.toFixed(2)}); >= 1 means endless features`,
  );
  for (let f = 0; f < 300; f++) {
    let left = dcfg.freeSpinsBase;
    let played = 0;
    while (left > 0) {
      const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: true });
      played++;
      left--;
      if (s.retriggerSpins > 0 && played < dcfg.maxFsSessionSpins) {
        left = Math.min(left + s.retriggerSpins, dcfg.maxFsSessionSpins - played);
      }
      assert.ok(played <= dcfg.maxFsSessionSpins, "feature exceeded the hard ceiling");
    }
  }
  checks++;
} finally {
  setWildPantherConfig(previousConfig);
  if (previousRandom === undefined) delete runtime.__maxhighRandom;
  else runtime.__maxhighRandom = previousRandom;
}
console.log(`PASS ${checks} Wild Panther final-refill/scatter/cap regressions`);
