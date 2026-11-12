import assert from "node:assert/strict";
import {
  DEFAULT_THOR_THUNDER_CONFIG,
  normalizeThorThunderConfig,
} from "../src/lib/thor-thunder-config";
import {
  setThorThunderConfig,
  getRuntimeSymbols,
} from "../src/components/maxhigh/thor-thunder/runtimeConfig";
import { evaluateBoard } from "../src/components/maxhigh/thor-thunder/tumbleEngine";
import { resolveSpin } from "../src/components/maxhigh/thor-thunder/spinResolver";
import { CELLS, COLS, ROWS } from "../src/components/maxhigh/thor-thunder/types";
assert.deepEqual([COLS, ROWS, CELLS], [7, 5, 35]);
const cfg = normalizeThorThunderConfig(DEFAULT_THOR_THUNDER_CONFIG);
setThorThunderConfig(cfg);
const symbols = getRuntimeSymbols().filter((symbol) => !symbol.scatter && !symbol.bomb);
assert.ok(symbols.length > 1);
for (const symbol of symbols) {
  const board = Array.from({ length: CELLS }, (_, i) => ({ key: `fixture-${i}`, sym: symbol }));
  const result = evaluateBoard(board, 5);
  assert.equal(result.win, Number((5 * symbol.pay[2]).toFixed(2)));
  assert.equal(result.winningKeys.size, CELLS);
}
for (let i = 0; i < 100; i++) {
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
  "PASS: current thor-thunder cluster engine reference paytable, board and payout-cap invariants",
);
