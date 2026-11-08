import assert from "node:assert/strict";
import { DEFAULT_WILD_PANTHER_CONFIG } from "../src/lib/wild-panther-config";
import {
  getRuntimeSymbols,
  getWildPantherConfig,
  setWildPantherConfig,
} from "../src/components/maxhigh/wild-panther/runtimeConfig";
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
  for (const [free, count] of [
    [false, 4],
    [false, 3],
    [true, 3],
  ] as const) {
    let draws = 0;
    runtime.__maxhighRandom = () => {
      const draw = draws++;
      const cell = Math.floor(draw / 2);
      return draw % 2 === 0 && cell >= 39 * CELLS && cell < 39 * CELLS + count ? 0.75 : 0;
    };
    const result = resolveSpin({
      bet: 1,
      ante: false,
      isFreeSpins: free,
      forceBoard: Array.from({ length: CELLS }, (_, i) => ({ key: `forced-${i}`, sym: pay })),
    });
    assert.equal(result.steps.length, 40, "Exercise the actual production tumble guard");
    assert.equal(draws, 40 * CELLS * 2, "No extra tumbles or random draws");
    assert.ok(result.steps.every((step) => step.board.every((cell) => !cell.sym.scatter)));
    assert.equal(result.steps.at(-1)!.afterFall.filter((cell) => cell.sym.scatter).length, count);
    assert.equal(result.scatters, count, "Visible final refill scatters must be counted");
    const cfg = getWildPantherConfig();
    const cash = free
      ? 0
      : ([...cfg.scatterCashTiers]
          .sort((a, b) => b.count - a.count)
          .find((tier) => count >= tier.count)?.mult ?? 0);
    assert.equal(result.scatterPay, cash);
    assert.equal(
      result.freeSpinsAwarded,
      !free && count >= cfg.freeSpinsTriggerCount ? cfg.freeSpinsBase : 0,
    );
    assert.equal(
      result.retriggerSpins,
      free && count >= cfg.freeSpinsRetriggerCount ? cfg.freeSpinsRetrigger : 0,
    );
    assert.equal(
      result.totalWin,
      +(result.steps.reduce((sum, step) => sum + step.tumbleWin, 0) + cash).toFixed(2),
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
    const rawCluster = +(bet * heart.pay[2]).toFixed(2);
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
} finally {
  setWildPantherConfig(previousConfig);
  if (previousRandom === undefined) delete runtime.__maxhighRandom;
  else runtime.__maxhighRandom = previousRandom;
}
console.log(`PASS ${checks} Wild Panther final-refill/scatter/cap regressions`);
