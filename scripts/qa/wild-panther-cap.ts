// Compare free-spin ceilings with identical per-feature seeds. Feature f uses seed (base + f) for every cap value, so features
// are identical until the cap binds. Mirrors the server: retriggers are clamped to the ceiling, wins already earned are kept.
//   npx tsx scripts/qa/wild-panther-cap.ts [features=4000] [baseSeed=1000] [caps=40,60,100,200]
import { resolveSpin, finalizeFreeSpinTotal } from "../../src/components/maxhigh/wild-panther/spinResolver";
import { getWildPantherConfig, setWildPantherConfig } from "../../src/components/maxhigh/wild-panther/runtimeConfig";
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = Number(process.argv[2] ?? 4000), S0 = Number(process.argv[3] ?? 1000);
const caps = (process.argv[4] ?? "40,60,100,200").split(",").map(Number);
const base = structuredClone(getWildPantherConfig());
const out: unknown[] = [];
for (const cap of caps) {
  setWildPantherConfig({ ...base, maxFsSessionSpins: cap });
  const cfg = getWildPantherConfig(), payCap = cfg.maxWinMult;
  const lens: number[] = [], wins: number[] = []; let hitCeiling = 0, trimmedSpins = 0, awardedSpins = 0;
  for (let f = 0; f < N; f++) {
    (globalThis as any).__maxhighRandom = mulberry32(S0 + f);
    let left = cfg.freeSpinsBase, played = 0, win = 0, acc = 0; awardedSpins += left;
    while (left > 0) {
      const s = resolveSpin({ bet: 1, ante: false, isFreeSpins: true });
      played++; left--; win += s.totalWin; acc += s.bombAccumulator;
      if (s.retriggerSpins > 0) {
        awardedSpins += s.retriggerSpins;
        const room = played < cfg.maxFsSessionSpins ? cfg.maxFsSessionSpins - played : 0;
        const next = Math.min(left + s.retriggerSpins, room);
        trimmedSpins += left + s.retriggerSpins - next; left = next;
      }
    }
    if (played >= cap) hitCeiling++;
    const raw = finalizeFreeSpinTotal(Math.round(win * 100) / 100, acc);
    wins.push(payCap > 0 ? Math.min(raw, payCap) : raw); lens.push(played);
  }
  const mean = wins.reduce((a, b) => a + b, 0) / N, sd = Math.sqrt(wins.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1));
  const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)];
  out.push({ cap, features: N, meanFeatureWinX: +mean.toFixed(3), ci95: [+(mean - 1.96 * sd / Math.sqrt(N)).toFixed(3), +(mean + 1.96 * sd / Math.sqrt(N)).toFixed(3)],
    meanLen: +(lens.reduce((a, b) => a + b, 0) / N).toFixed(2), p99Len: q(lens, 0.99), maxLen: Math.max(...lens), ceilingHitPct: +(100 * hitCeiling / N).toFixed(2),
    trimmedSpinsPct: +(100 * trimmedSpins / awardedSpins).toFixed(3), p99WinX: q(wins, 0.99), p999WinX: q(wins, 0.999), maxWinX: Math.max(...wins), featuresAtPayCap: wins.filter((w) => payCap > 0 && w >= payCap).length });
}
console.log(JSON.stringify(out, null, 1));
