/**
 * Independent referee for the two payline slots (Fire Spike, Coin Volcano):
 * recomputes every payline win from the grid and checks the spin total.
 *
 *   npx tsx scripts/qa-payline-referee.ts
 */
import { DEFAULT_FIRE_SPIKE_CONFIG, betPerLine as fsBpl } from "../src/lib/fire-spike-config";
import { setFireSpikeConfig } from "../src/components/maxhigh/fire-spike/runtimeConfig";
import { resolveFireSpikeSpin } from "../src/components/maxhigh/fire-spike/spinResolver";
import { DEFAULT_COIN_VOLCANO_CONFIG, betPerLine as cvBpl } from "../src/lib/coin-volcano-config";
import { setCoinVolcanoConfig } from "../src/components/maxhigh/coin-volcano/runtimeConfig";
import { resolveCoinVolcanoSpin } from "../src/components/maxhigh/coin-volcano/spinResolver";

type Sym = { kind: string; pay: number[]; wild?: boolean; scatter?: boolean; tier: string };
type Cfg = {
  paylines: number[][];
  paylineCount: number;
  reelsCount: number;
  minMatchLength: number;
  maxWinMult: number;
  symbols: Sym[];
};
type Spin = {
  grid: string[][];
  paylineWin: number;
  paylineWins: { lineIndex: number; count: number; payout: number }[];
  instantMix: { payout: number } | null;
  grandJackpotWin: number;
  totalWin: number;
};

const r2 = (n: number) => +n.toFixed(2);

/** Line pays: longest left-to-right run of one symbol (wilds substitute, scatter breaks). */
function refereeLines(grid: string[][], bet: number, cfg: Cfg, bpl: number) {
  const sym = (k: string) => cfg.symbols.find((s) => s.kind === k)!;
  let total = 0;
  const lines: Record<number, number> = {};
  for (let li = 0; li < cfg.paylineCount; li++) {
    const cells = cfg.paylines[li]!.slice(0, cfg.reelsCount).map((row, reel) => grid[reel]![row]!);
    const first = cells.find((c) => !sym(c).wild);
    const target = first === undefined ? cells[0]! : first;
    if (sym(target).scatter) continue;
    let n = 0;
    for (const c of cells) {
      if (sym(c).scatter) break;
      if (c === target || sym(c).wild) n++;
      else break;
    }
    if (n < cfg.minMatchLength) continue;
    const mult = sym(target).pay[Math.min(n, 5) - 3] ?? 0;
    if (mult > 0) {
      lines[li] = r2(mult * bpl);
      total += lines[li]!;
    }
  }
  return { total: r2(total), lines };
}

function audit(
  name: string,
  cfg: Cfg,
  spin: (bet: number) => Spin,
  bplOf: (bet: number) => number,
) {
  let bad = 0;
  let wins = 0;
  const N = 40_000;
  const examples: string[] = [];
  for (let i = 0; i < N; i++) {
    const bet = [0.2, 1, 5, 20][i % 4]!;
    const s = spin(bet);
    if (s.totalWin > 0) wins++;
    const ref = refereeLines(s.grid, bet, cfg, bplOf(bet));
    const errs: string[] = [];
    if (Math.abs(ref.total - s.paylineWin) > 0.011)
      errs.push(`paylines ${s.paylineWin} vs ${ref.total}`);
    const raw = r2(s.paylineWin + (s.instantMix?.payout ?? 0) + s.grandJackpotWin);
    const capped = cfg.maxWinMult > 0 ? Math.min(raw, r2(bet * cfg.maxWinMult)) : raw;
    if (Math.abs(capped - s.totalWin) > 0.011) errs.push(`total ${s.totalWin} vs ${capped}`);
    if (!(s.totalWin >= 0) || !Number.isFinite(s.totalWin)) errs.push("bad total");
    if (s.grid.length !== cfg.reelsCount || s.grid.some((r) => r.length !== 3))
      errs.push("grid shape");
    if (errs.length) {
      bad++;
      if (examples.length < 3) examples.push(errs.join(", "));
    }
  }
  console.log(
    `${bad ? "FAIL" : "ok  "} ${name.padEnd(14)} spins ${N} wins ${wins} mismatches ${bad} ${examples.join(" | ")}`,
  );
  return bad;
}

setFireSpikeConfig(DEFAULT_FIRE_SPIKE_CONFIG);
setCoinVolcanoConfig(DEFAULT_COIN_VOLCANO_CONFIG);
const bad =
  audit(
    "fire-spike",
    DEFAULT_FIRE_SPIKE_CONFIG as unknown as Cfg,
    (b) => resolveFireSpikeSpin({ totalBet: b }) as unknown as Spin,
    (b) => fsBpl(b, DEFAULT_FIRE_SPIKE_CONFIG),
  ) +
  audit(
    "coin-volcano",
    DEFAULT_COIN_VOLCANO_CONFIG as unknown as Cfg,
    (b) => resolveCoinVolcanoSpin({ totalBet: b }) as unknown as Spin,
    (b) => cvBpl(b, DEFAULT_COIN_VOLCANO_CONFIG),
  );
process.exit(bad ? 1 : 0);
