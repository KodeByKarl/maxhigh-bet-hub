import assert from "node:assert/strict";
import { DEFAULT_FROST_FOX_CONFIG, normalizeFrostFoxConfig } from "../src/lib/frost-fox-config";
import {
  setFrostFoxConfig,
  getRuntimeSymbols,
} from "../src/components/maxhigh/frost-fox/runtimeConfig";
import { evaluateBoard } from "../src/components/maxhigh/frost-fox/tumbleEngine";
import { resolveSpin } from "../src/components/maxhigh/frost-fox/spinResolver";
import { CELLS, REEL_HEIGHTS, cellIndex } from "../src/components/maxhigh/frost-fox/types";
assert.deepEqual(REEL_HEIGHTS, [4, 5, 6, 5, 4]);
assert.equal(CELLS, 24);
assert.deepEqual(
  REEL_HEIGHTS.flatMap((height, col) =>
    Array.from({ length: height }, (_, row) => cellIndex(col, row)),
  ),
  Array.from({ length: 24 }, (_, i) => i),
);
const cfg = normalizeFrostFoxConfig(DEFAULT_FROST_FOX_CONFIG);
setFrostFoxConfig(cfg);
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
  "PASS: current frost-fox cluster engine reference paytable, board and payout-cap invariants",
);
