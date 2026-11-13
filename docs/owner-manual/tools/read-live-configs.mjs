// Read-only: fetches each game's public engine configuration from https://maxhigh.online.
// No login, no POST, no writes. Run from the repository root.
import fs from 'node:fs';
import { Client, hasFunction, verifyRelease } from '../../../deploy/production/live-client.mjs';

const allocation = JSON.parse(fs.readFileSync('deploy/handoff/PROPOSED_GAME_ALLOCATION.json'));
const games = fs.readFileSync('deploy/diagnostics/uat-game-catalog.tsv', 'utf8').trim().split('\n').slice(1)
  .map(l => l.split('\t')).filter(r => allocation.available.includes(r[0]))
  .map(([id, category, title, min, max]) => ({ id, category, title, min: Number(min), max: Number(max) }));
const pascal = id => id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
const special = { lucky9: 'getLucky9EngineConfigFn', threecardpoker: 'getThreeCardPokerEngineConfigFn' };
const proof = await verifyRelease();
const client = new Client();
const out = { ...proof, readAt: new Date().toISOString(), games: [] };
for (const g of games) {
  let fn = special[g.id] ?? `get${pascal(g.id)}EngineConfigFn`, input;
  if (!hasFunction(fn)) { fn = 'getRealmsEngineConfigFn'; input = { gameId: g.id }; }
  const row = { ...g, getter: fn };
  try { row.config = await client.rpc(fn, input, { method: 'GET' }); row.ok = true; }
  catch (e) { row.ok = false; row.error = e.message.slice(0, 160); }
  out.games.push(row);
  console.log(g.id, fn, row.ok ? 'ok' : row.error);
}
fs.writeFileSync('docs/owner-manual/data/live-engine-configs.json', JSON.stringify(out, null, 2));
