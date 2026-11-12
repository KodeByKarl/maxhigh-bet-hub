import assert from "node:assert/strict";
import { findRealmsGame, realmsDefaultConfig } from "../src/lib/realms";
import { createEngineCtx } from "../src/components/maxhigh/realms/engine/types";
import { evaluateBoard } from "../src/components/maxhigh/realms/engine/tumbleEngine";
import { resolveSpin } from "../src/components/maxhigh/realms/engine/spinResolver";

const game = findRealmsGame("tidecaller-hoard")!;
assert.deepEqual(game.board, { cols: 7, rows: 5 });
const cfg = realmsDefaultConfig(game.id);
const ctx = createEngineCtx(cfg, game.board);
assert.equal(ctx.cells, 35);
for (const sym of ctx.syms.filter((symbol) => !symbol.scatter && !symbol.bomb)) {
  const board = Array.from({ length: ctx.cells }, (_, i) => ({ key: `fixture-${i}`, sym }));
  const result = evaluateBoard(ctx, board, 5);
  assert.equal(result.win, Number((5 * sym.pay[2]).toFixed(2)));
  assert.equal(result.winningKeys.size, 35);
}
for (let i = 0; i < 100; i++) {
  const script = resolveSpin(ctx, { bet: 5, ante: false, isFreeSpins: i % 2 === 0 });
  assert.equal(script.initialBoard.length, 35);
  assert(Number.isFinite(script.totalWin) && script.totalWin >= 0);
  if (cfg.maxWinMult > 0) assert(script.totalWin <= 5 * cfg.maxWinMult);
  for (const step of script.steps) assert.equal(step.afterFall.length, 35);
}
console.log("PASS Tidecaller Hoard geometry, reference payouts and local spin invariants");
