// Independent, seeded RTP validation for wild-panther with 95% confidence intervals.
//   npx tsx scripts/qa/wild-panther-validate.ts [baseSpins=600000] [features=40000] [seed=20261110] [ante=0|1]
// RTP per unit stake = E[base round win incl. scatter cash] + P(trigger) * E[feature win], with the server's feature
// finalisation, per-round cap (maxWinMult) and the maxFsSessionSpins ceiling. Variance via the delta method.
import { resolveSpin, finalizeFreeSpinTotal } from "../../src/components/maxhigh/wild-panther/spinResolver";
import { getWildPantherConfig, setWildPantherConfig } from "../../src/components/maxhigh/wild-panther/runtimeConfig";
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = Number(process.argv[2] ?? 600000), M = Number(process.argv[3] ?? 40000), seed = Number(process.argv[4] ?? 20261110), ante = process.argv[5] === "1";
if (process.env.WP_OVERRIDE) setWildPantherConfig({ ...getWildPantherConfig(), ...JSON.parse(process.env.WP_OVERRIDE) }); // try candidate settings without editing the config
const BET = Number(process.env.WP_BET ?? 1); // bet size: shows the effect of 2-decimal rounding on tiny pays
const cfg = getWildPantherConfig(), cap = cfg.maxWinMult, stake = ante ? cfg.anteBetMult : 1;
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[], m = mean(a)) => Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1));

(globalThis as any).__maxhighRandom = mulberry32(seed);
const base: number[] = []; let triggers = 0, hits = 0;
for (let i = 0; i < N; i++) {
  const s = resolveSpin({ bet: BET, ante, isFreeSpins: false });
  const wx = s.totalWin / BET; const w = cap > 0 ? Math.min(wx, cap) : wx;
  base.push(w); if (w > 0) hits++; if (s.freeSpinsAwarded > 0) triggers++;
}
(globalThis as any).__maxhighRandom = mulberry32(seed ^ 0x9e3779b9);
const feat: number[] = [], lens: number[] = []; let ceiling = 0, trimmed = 0, awarded = 0, retrigSpins = 0, fsSpins = 0, atPayCap = 0;
for (let f = 0; f < M; f++) {
  let left = cfg.freeSpinsBase, played = 0, win = 0, acc = 0; awarded += left;
  while (left > 0) {
    const s = resolveSpin({ bet: BET, ante: false, isFreeSpins: true });
    played++; left--; fsSpins++; win += s.totalWin; acc += s.bombAccumulator;
    if (s.retriggerSpins > 0) {
      retrigSpins++; awarded += s.retriggerSpins;
      const room = played < cfg.maxFsSessionSpins ? cfg.maxFsSessionSpins - played : 0;
      const next = Math.min(left + s.retriggerSpins, room); trimmed += left + s.retriggerSpins - next; left = next;
    }
  }
  if (played >= cfg.maxFsSessionSpins) ceiling++;
  const raw = finalizeFreeSpinTotal(Math.round(win * 100) / 100, acc) / BET;
  const paid = cap > 0 ? Math.min(raw, cap) : raw; if (cap > 0 && raw >= cap) atPayCap++;
  feat.push(paid); lens.push(played);
}
const p = triggers / N, mb = mean(base), sb = sd(base, mb), mF = mean(feat), sF = sd(feat, mF);
const rtp = (mb + p * mF) / stake;
const se = Math.sqrt(sb ** 2 / N + (mF ** 2 * p * (1 - p)) / N + (p ** 2 * sF ** 2) / M) / stake;
const q = (a: number[], x: number) => [...a].sort((u, v) => u - v)[Math.floor(a.length * x)];
const r = (x: number, d = 4) => +x.toFixed(d);
const mx = (a: number[]) => a.reduce((m, v) => (v > m ? v : m), -Infinity); // no spread: arrays can hold millions of values
console.log(JSON.stringify({
  seed, ante, bet: BET, baseSpins: N, features: M, target: 0.965,
  rtp: r(rtp), ci95: [r(rtp - 1.96 * se), r(rtp + 1.96 * se)], containsTarget: rtp - 1.96 * se <= 0.965 && 0.965 <= rtp + 1.96 * se,
  baseOnlyRtp: r(mb / stake), featureShareOfRtp: r(p * mF / stake / rtp), hitFrequency: r(hits / N), triggerOneIn: r(1 / Math.max(p, 1e-9), 1),
  triggerCI95: [r(p - 1.96 * Math.sqrt(p * (1 - p) / N), 6), r(p + 1.96 * Math.sqrt(p * (1 - p) / N), 6)],
  retriggerPerFreeSpin: r(retrigSpins / fsSpins), meanFeatureWinX: r(mF, 2), buyFeature: { priceX: cfg.buyFeatureMult, rtp: r(mF / cfg.buyFeatureMult), ci95: [r((mF - 1.96 * sF / Math.sqrt(M)) / cfg.buyFeatureMult), r((mF + 1.96 * sF / Math.sqrt(M)) / cfg.buyFeatureMult)] },
  featureWinCI95: [r(mF - 1.96 * sF / Math.sqrt(M), 2), r(mF + 1.96 * sF / Math.sqrt(M), 2)],
  featureLen: { mean: r(mean(lens), 2), median: q(lens, 0.5), p99: q(lens, 0.99), max: mx(lens) },
  ceiling: { spins: cfg.maxFsSessionSpins, featuresHitPct: r(100 * ceiling / M, 3), awardedSpinsTrimmedPct: r(100 * trimmed / awarded, 4) },
  payout: { maxWinMult: cap, featuresAtPayCapPct: r(100 * atPayCap / M, 3), p99FeatureX: q(feat, 0.99), maxBaseRoundX: mx(base), maxFeatureX: mx(feat) },
}, null, 1));
