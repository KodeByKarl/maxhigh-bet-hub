import assert from "node:assert/strict";
import fs from "node:fs";
import { roundRandom } from "../src/server/round-random.server";
import { resolveSpin } from "../src/components/maxhigh/golden-panther/spinResolver";
import { setGoldenPantherConfig } from "../src/components/maxhigh/golden-panther/runtimeConfig";
import { normalizeGoldenPantherConfig } from "../src/lib/golden-panther-config";
import { hashServerSeed } from "../src/server/provably-fair/engine.server";
const fixture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const { proof, result, serverSeed } = fixture;
assert.equal(hashServerSeed(serverSeed), proof.serverSeedHash);
setGoldenPantherConfig(
  normalizeGoldenPantherConfig(proof.engineConfig ? JSON.parse(proof.engineConfig) : null),
);
const state = { serverSeed, clientSeed: proof.clientSeed, nonce: proof.nonce, draws: 0 };
const replay = roundRandom.run(state, () =>
  resolveSpin({ ...proof.input, isFreeSpins: false, collectBombsInFreeSpins: true }),
);
assert.equal(state.draws, proof.draws);
assert.deepEqual(
  replay.initialBoard.map((c) => c.sym.id),
  result.script.initialBoard.map((c: { sym: { id: string } }) => c.sym.id),
);
assert.equal(replay.rawWin, result.script.rawWin);
assert.equal(replay.freeSpinsAwarded, result.script.freeSpinsAwarded);
assert.equal(replay.totalWin, result.script.totalWin);
console.log(
  "PASS actual HTTP round commitment, nonce, draw count, board, payout and feature replay",
);
