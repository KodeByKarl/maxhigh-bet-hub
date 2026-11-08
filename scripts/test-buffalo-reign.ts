import assert from "node:assert/strict";
import {
  DEFAULT_BUFFALO_REIGN_CONFIG,
  normalizeBuffaloReignConfig,
} from "../src/lib/buffalo-reign-config";
import {
  setBuffaloReignConfig,
  getRuntimeSymbols,
} from "../src/components/maxhigh/buffalo-reign/runtimeConfig";
import { evaluateBoard } from "../src/components/maxhigh/buffalo-reign/tumbleEngine";
import { resolveSpin } from "../src/components/maxhigh/buffalo-reign/spinResolver";
import { CELLS } from "../src/components/maxhigh/buffalo-reign/types";
const cfg = normalizeBuffaloReignConfig(DEFAULT_BUFFALO_REIGN_CONFIG);
setBuffaloReignConfig(cfg);
const symbols = getRuntimeSymbols().filter((symbol) => !symbol.scatter && !symbol.bomb);
assert.ok(symbols.length > 1);
for (const symbol of symbols) {
  const board = Array.from({ length: CELLS }, (_, i) => ({ key: `fixture-${i}`, sym: symbol }));
  const result = evaluateBoard(board, 5);
  assert.equal(result.win, Number((5 * symbol.pay[2]).toFixed(2)));
  assert.equal(result.winningKeys.size, CELLS);
}
for (let i = 0; i < 1000; i++) {
  const result = resolveSpin({
    bet: 5,
    ante: false,
    isFreeSpins: i % 2 === 0,
    initialBombAccumulator: i % 2 === 0 ? 2 : 0,
  });
  assert.ok(Number.isFinite(result.totalWin) && result.totalWin >= 0);
  if (cfg.maxWinMult > 0) assert.ok(result.totalWin <= 5 * cfg.maxWinMult);
  for (const step of result.steps) assert.equal(step.afterFall.length, CELLS);
}
console.log(
  "PASS: current buffalo-reign cluster engine reference paytable, board and payout-cap invariants",
);
