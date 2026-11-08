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
} finally {
  setWildPantherConfig(previousConfig);
  if (previousRandom === undefined) delete runtime.__maxhighRandom;
  else runtime.__maxhighRandom = previousRandom;
}
console.log(`PASS ${checks} Wild Panther final-refill/scatter regressions`);
