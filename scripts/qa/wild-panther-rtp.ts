// Seeded whole-round RTP for wild-panther using the real engine and the server's feature finalisation + cap.
//   npx tsx scripts/qa/wild-panther-rtp.ts [rounds=100000] [seed=1]
import { resolveSpin, finalizeFreeSpinTotal } from "../../src/components/maxhigh/wild-panther/spinResolver";
import { getWildPantherConfig, setWildPantherConfig } from "../../src/components/maxhigh/wild-panther/runtimeConfig";
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ROUNDS = Number(process.argv[2] ?? 100000), seed = Number(process.argv[3] ?? 1);
(globalThis as any).__maxhighRandom = mulberry32(seed);
import { DEFAULT_GOLDEN_PANTHER_CONFIG as G } from "../../src/lib/golden-panther-config";
import { DEFAULT_WILD_PANTHER_CONFIG as W } from "../../src/lib/wild-panther-config";
const baseCfg: any = process.env.WP_FROM_GOLDEN ? { ...W, deadSpinChancePercent: G.deadSpinChancePercent, seedClusterMin: G.seedClusterMin, seedClusterMax: G.seedClusterMax, bombChanceBasePercent: G.bombChanceBasePercent, bombChanceFreeSpinsPercent: G.bombChanceFreeSpinsPercent, bombTable: G.bombTable, minCluster: G.minCluster, symbols: W.symbols.map((w) => ({ ...w, pay: (G.symbols.find((x) => x.id === w.id)?.pay ?? w.pay) })) } : W;
const scale = Number(process.env.WP_PAY_SCALE ?? 1);
const merged = { ...baseCfg, ...(process.env.WP_CFG ? JSON.parse(process.env.WP_CFG) : {}) };
merged.symbols = merged.symbols.map((s: any) => ({ ...s, pay: s.pay.map((p: number) => +(p * scale).toFixed(4)) }));
setWildPantherConfig(merged);
const cfg = getWildPantherConfig(), cap = cfg.maxWinMult;
function feature(spins: number) {
  let left = spins, played = 0, win = 0, acc = 0;
  while (left > 0) {
    const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: true });
    played++; left--; win += s.totalWin; acc += s.bombAccumulator;
    if (s.retriggerSpins > 0 && played < cfg.maxFsSessionSpins) left = Math.min(left + s.retriggerSpins, cfg.maxFsSessionSpins - played);
  }
  const raw = finalizeFreeSpinTotal(Math.round(win * 100) / 100, acc);
  return { paid: cap > 0 ? Math.min(raw, cap) : raw, raw, played, acc };
}
let base = 0, feat = 0, featRaw = 0, triggers = 0, capped = 0, maxPaid = 0;
for (let i = 0; i < ROUNDS; i++) {
  const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: false });
  base += Math.min(s.totalWin, cap || Infinity);
  if (s.freeSpinsAwarded > 0) { triggers++; const f = feature(s.freeSpinsAwarded); feat += f.paid; featRaw += f.raw; if (f.raw > cap) capped++; maxPaid = Math.max(maxPaid, f.paid); }
}
const r = (x: number) => +x.toFixed(4);
console.log(JSON.stringify({ seed, rounds: ROUNDS, retriggerCount: cfg.freeSpinsRetriggerCount, triggerEvery: r(ROUNDS / Math.max(1, triggers)),
  baseRtp: r(base / ROUNDS), featureRtpCapped: r(feat / ROUNDS), featureRtpUncapped: r(featRaw / ROUNDS), totalRtpCapped: r((base + feat) / ROUNDS),
  meanFeatureWinX: r(feat / Math.max(1, triggers)), featuresHittingCap: capped, featuresTotal: triggers, maxFeatureWinX: maxPaid }));
