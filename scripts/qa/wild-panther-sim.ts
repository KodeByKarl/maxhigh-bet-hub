// Deterministic seeded simulation of the wild-panther engine (no DB, no network).
//   npx tsx scripts/qa/wild-panther-sim.ts [spins=20000] [seed=1]
import { resolveSpin } from "../../src/components/maxhigh/wild-panther/spinResolver";
import { getWildPantherConfig } from "../../src/components/maxhigh/wild-panther/runtimeConfig";

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = Number(process.argv[2] ?? 20000), seed = Number(process.argv[3] ?? 1);
(globalThis as any).__maxhighRandom = mulberry32(seed);
const cfg = getWildPantherConfig();
let fsSpins = 0, retr = 0, wins = 0, scDist: Record<number, number> = {};
for (let i = 0; i < N; i++) {
  const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: true });
  fsSpins++; if (s.retriggerSpins > 0) retr++;
  scDist[s.scatters] = (scDist[s.scatters] ?? 0) + 1; if (s.totalWin > 0) wins++;
}
const p = retr / fsSpins;
console.log(JSON.stringify({ seed, freeSpinsSimulated: fsSpins, retriggerRate: +p.toFixed(4), hitRate: +(wins / fsSpins).toFixed(3),
  retriggerAward: cfg.freeSpinsRetrigger, branching: +(p * cfg.freeSpinsRetrigger).toFixed(3), terminates: p * cfg.freeSpinsRetrigger < 1,
  expectedFeatureLength: p * cfg.freeSpinsRetrigger < 1 ? +(cfg.freeSpinsBase / (1 - p * cfg.freeSpinsRetrigger)).toFixed(1) : "infinite",
  scatterCountDistribution: scDist }));

// Whole-feature simulation mirroring the server's session bookkeeping (incl. the maxFsSessionSpins ceiling).
const FEATURES = Number(process.argv[4] ?? 3000);
const lens: number[] = []; let capped = 0;
for (let f = 0; f < FEATURES; f++) {
  let left = cfg.freeSpinsBase, played = 0;
  while (left > 0) {
    const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: true });
    played++; left--;
    if (s.retriggerSpins > 0 && played < cfg.maxFsSessionSpins) left = Math.min(left + s.retriggerSpins, cfg.maxFsSessionSpins - played);
    if (played > 5000) throw new Error("feature exceeded 5000 spins - not bounded");
  }
  if (played >= cfg.maxFsSessionSpins) capped++;
  lens.push(played);
}
lens.sort((a, b) => a - b);
console.log(JSON.stringify({ features: FEATURES, meanLength: +(lens.reduce((a, b) => a + b, 0) / FEATURES).toFixed(1), median: lens[FEATURES >> 1], p99: lens[Math.floor(FEATURES * 0.99)], max: lens[FEATURES - 1], hitCeiling: capped }));
