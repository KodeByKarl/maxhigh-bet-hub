import assert from "node:assert/strict";
import { slotGames } from "../../src/lib/games";
import { resolveLazyGame } from "../../src/components/maxhigh/gamePlayRegistry";
assert.equal(slotGames.length, 100);
assert.equal(new Set(slotGames.map(game => game.id)).size, 100);
for (const game of slotGames) assert.ok(resolveLazyGame(game.id), game.id);
console.log("100");
