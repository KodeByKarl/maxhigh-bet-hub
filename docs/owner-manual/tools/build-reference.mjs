// Builds the 50-game configuration reference from data/live-engine-configs.json
// (captured read-only from https://maxhigh.online). Run from the repository root.
import fs from 'node:fs';

const dir = 'docs/owner-manual';
const live = JSON.parse(fs.readFileSync(`${dir}/data/live-engine-configs.json`, 'utf8'));

const VOLCANO = new Set(['fire-spike', 'coin-volcano']);
export function family(g) {
  if (g.category === 'fishing') return 'Fishing';
  if (g.id === 'color-game') return 'Color Game';
  if (g.category === 'cards') return 'Card table';
  if (g.getter === 'getRealmsEngineConfigFn') return 'Realms slot';
  if (VOLCANO.has(g.id)) return 'Lines slot (RTP profiles)';
  return 'Cluster slot';
}
const TABS = {
  'Cluster slot': 'Lobby | Dead spin | Symbols | Wilds/Bombs | Free spins',
  'Realms slot': 'Lobby | Hit rate | Symbols | Multipliers | Free spins & buy',
  'Lines slot (RTP profiles)': 'Lobby | Symbols | Mix / Jackpot | RTP / Weights | Risk / Cap',
  Fishing: 'Lobby | Fish Tiers | Weapons | Boss | Risk / RTP',
  'Card table': 'Lobby | Payouts | Limits / Shoe | Risk / RTP (names vary slightly per table)',
  'Color Game': 'Lobby | Colors / Pays | Limits',
};
const money = n => (n === undefined || n === null || n === '' ? '—' : `₱${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const num = n => (n === undefined || n === null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 }));

function betLimits(g, c) {
  switch (g.id) {
    case 'baccarat': return `Player/Banker/Tie/Pairs ${money(c.minPlayerBet)}–${money(c.maxPlayerBet)} (engine)`;
    case 'lucky9': return `Player/Dealer/Tie ${money(c.minPlayerBet)}–${money(c.maxPlayerBet)} (engine)`;
    case 'threecardpoker': return `Ante ${money(c.minAnteBet)}–${money(c.maxAnteBet)}; Pair Plus ${money(c.minPairPlusBet)}–${money(c.maxPairPlusBet)} (engine)`;
    case 'ace-high': return `Base ${money(c.minBet)}–${money(c.maxBet)}; Tie ${money(c.minTieBet)}–${money(c.maxTieBet)} (engine)`;
    case 'color-game': return `${money(c.minBet)}–${money(c.maxBet)} total, ${money(c.maxSpotBet)} per colour (engine)`;
  }
  if (g.category === 'fishing') return `Weapon cost ${money(c.minBet)}–${money(c.maxBet)} (engine)`;
  return `${money(g.min)}–${money(g.max)} (Lobby tab, catalog default)`;
}

function keySettings(g, c) {
  const f = family(g);
  if (f === 'Cluster slot' || f === 'Realms slot')
    return [`Dead spin ${num(c.deadSpinChancePercent)}%`, `Win cap ${num(c.maxWinMult)}×`,
      `Free spins: ${num(c.freeSpinsTriggerCount)} scatters → ${num(c.freeSpinsBase)} spins (+${num(c.freeSpinsRetrigger)} retrigger)`,
      `Bomb/orb chance ${num(c.bombChanceBasePercent)}% base, ${num(c.bombChanceFreeSpinsPercent)}% in free spins`,
      `Buy feature ${num(c.buyFeatureMult)}× bet`, `Ante ${num(c.anteBetMult)}× bet`].join('; ');
  if (f === 'Lines slot (RTP profiles)')
    return [`Active RTP profile ${c.activeRtpProfile}`, `Profiles ${(c.rtpProfiles ?? []).map(p => p.targetRtp + '%').join(' / ')}`,
      `Win cap ${num(c.maxWinMult)}×`, `Grand jackpot ${num(c.grandJackpotMult)}×`, `${num(c.paylineCount)} lines`].join('; ');
  if (f === 'Fishing')
    return [`RTP label ${num(c.rtpTarget)}%`, `Max hit chance ${num(c.maxHitChance)}`, `Max fish on screen ${num(c.maxFishOnScreen)}`,
      `Spawn every ${num(c.spawnIntervalSec)} s`, `${(c.fishTiers ?? []).length} fish tiers`, `${(c.weapons ?? []).length} weapons`,
      `Boss spawn ${num(c.boss?.spawnChance)}/tick`].join('; ');
  if (f === 'Color Game')
    return [`RTP label ${num(c.rtpTarget)}%`, `${(c.spots ?? []).length} colours`, `Chip steps ${(c.betSteps ?? []).join(', ')}`].join('; ');
  const parts = [`RTP label ${num(c.rtpTarget ?? c.targetRtp)}%`];
  if (g.id === 'baccarat') parts.push(`Player ${c.playerPayout}:1`, `Banker ${c.bankerPayout}:1`, `Tie ${c.tiePayout}:1`, `Pairs ${c.playerPairPayout}:1`, `${c.deckCount} decks`);
  if (g.id === 'lucky9') parts.push(`Player ${c.playerPayout}:1`, `Dealer ${c.dealerPayout}:1`, `Tie ${c.tiePayout}:1`, `Draw below ${c.drawThreshold}`, `${c.deckCount} decks`);
  if (g.id === 'threecardpoker') parts.push(`Ante ${c.antePayout}:1`, `Play ${c.playPayout}:1`, `Dealer qualifies with ${c.dealerQualifyRank}-high`, `Ante bonus ${c.anteBonusEnabled ? 'on' : 'off'}`);
  if (g.id === 'ace-high') parts.push(`Base pays ${c.basePayoutMult}× (even money)`, `Tie side bet ${c.tieSideBetMult}×`, `War max depth ${c.warMaxDepth}`, `Win cap ${num(c.maxWinMult)}×`, `${c.decksInShoe} decks`);
  return parts.join('; ');
}

const rows = live.games.map((g, i) => {
  if (!g.ok) throw new Error(`Missing live config for ${g.id}`);
  const c = g.config;
  return { n: i + 1, title: g.title, id: g.id, family: family(g), tabs: TABS[family(g)], bets: betLimits(g, c), settings: keySettings(g, c) };
});
if (rows.length !== 50) throw new Error('Expected 50 games');

const csv = s => `"${String(s).replace(/"/g, '""')}"`;
fs.writeFileSync(`${dir}/MAXHIGH_50_GAMES_CONFIGURATION_REFERENCE.csv`,
  '﻿' + ['#,Game,Game ID,Family,Admin tabs,Bet limits,Current key settings (live)']
    .concat(rows.map(r => [r.n, r.title, r.id, r.family, r.tabs, r.bets, r.settings].map(csv).join(','))).join('\r\n'));

const md = [`# MaxHigh — 50 Games Configuration Reference`, '',
  `Values read (read-only) from https://maxhigh.online, release ${live.sha.slice(0, 7)}, on ${live.readAt}.`,
  'Lobby bet limits for slots are the catalog defaults; check the Lobby tab for any override.', '',
  '| # | Game | Family | Bet limits | Current key settings |', '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.n} | ${r.title} (\`${r.id}\`) | ${r.family} | ${r.bets} | ${r.settings} |`)].join('\n');
fs.writeFileSync(`${dir}/MAXHIGH_50_GAMES_CONFIGURATION_REFERENCE.md`, md + '\n');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<table class="ref"><thead><tr><th>#</th><th>Game</th><th>Family</th><th>Bet limits</th><th>Current key settings (live)</th></tr></thead><tbody>${
  rows.map(r => `<tr><td>${r.n}</td><td><b>${esc(r.title)}</b><br><span class="mono">${r.id}</span></td><td>${esc(r.family)}</td><td>${esc(r.bets)}</td><td>${esc(r.settings)}</td></tr>`).join('')
}</tbody></table>`;
fs.writeFileSync(`${dir}/data/reference-table.html`, html);

const counts = rows.reduce((a, r) => ((a[r.family] = (a[r.family] ?? 0) + 1), a), {});
fs.writeFileSync(`${dir}/data/reference-meta.json`, JSON.stringify({ sha: live.sha, readAt: live.readAt, counts }, null, 2));
console.log('reference rows', rows.length, counts);
