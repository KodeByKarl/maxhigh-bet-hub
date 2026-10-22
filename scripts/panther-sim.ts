/**
 * Panther family simulator — drives each title's own engine with the
 * settlement rules its server uses, so RTP can be measured offline.
 *
 * Every Panther engine keeps its config in a module global, so one process
 * should simulate one title at a time (load → setConfig → measure).
 */
type Sym = {
  id: string;
  pay: [number, number, number];
  weight: number;
  scatter?: boolean;
  bomb?: boolean;
};
export type PantherCfg = {
  symbols: Sym[];
  anteScatterWeightMult: number;
  anteBetMult: number;
  buyFeatureMult: number;
  freeSpinsBase: number;
  freeSpinsTriggerCount: number;
  maxWinMult?: number;
  maxFsBombMult?: number;
  maxFsSessionSpins?: number;
  [key: string]: unknown;
};
type Cell = { sym: { scatter?: boolean } };
type Script = {
  totalWin: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  bombAccumulator: number;
};

export type PantherGame = {
  id: string;
  /** Wild Panther sums bombs across a feature; the rest keep the strongest. */
  sumRule: boolean;
  defaults: PantherCfg;
  setConfig: (cfg: PantherCfg) => void;
  spin: (o: { ante: boolean; isFreeSpins: boolean; acc: number }) => Script;
  board: (ante: boolean) => Cell[];
  scatterCash: (count: number) => number;
  finalize: (win: number, acc: number) => number;
};

const pascal = (id: string) =>
  id
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
const upper = (id: string) => id.toUpperCase().replace(/-/g, "_");

/** Win cap the server enforces (Wild Panther gets the catalog's 10,000×). */
export function maxWinOf(cfg: PantherCfg) {
  return typeof cfg.maxWinMult === "number" && cfg.maxWinMult > 0 ? cfg.maxWinMult : 10_000;
}

export async function loadPanther(id: string): Promise<PantherGame> {
  const lib = (await import(`../src/lib/${id}-config.ts`)) as Record<string, unknown>;
  const rt = (await import(`../src/components/maxhigh/${id}/runtimeConfig.ts`)) as Record<
    string,
    (c: unknown) => void
  >;
  const sr = (await import(`../src/components/maxhigh/${id}/spinResolver.ts`)) as {
    resolveSpin: (o: Record<string, unknown>) => Script;
    finalizeFreeSpinTotal: (w: number, a: number) => number;
  };
  const gs = (await import(`../src/components/maxhigh/${id}/gridState.ts`)) as {
    buildBoard: (ante: boolean, fs: boolean, seed?: boolean) => Cell[];
  };
  const pt = (await import(`../src/components/maxhigh/${id}/paytable.ts`)) as {
    scatterCashPay: (count: number, bet: number) => number;
  };
  const defaults = structuredClone(lib[`DEFAULT_${upper(id)}_CONFIG`]) as PantherCfg;
  return {
    id,
    sumRule: id === "wild-panther",
    defaults,
    setConfig: (cfg) => rt[`set${pascal(id)}Config`]!(cfg),
    spin: (o) =>
      sr.resolveSpin({
        bet: 1,
        ante: o.ante,
        isFreeSpins: o.isFreeSpins,
        collectBombsInFreeSpins: true,
        initialBombAccumulator: o.acc,
      }),
    board: (ante) => gs.buildBoard(ante, false, true),
    scatterCash: (count) => pt.scatterCashPay(count, 1),
    finalize: sr.finalizeFreeSpinTotal,
  };
}

/** One free-spin feature of `spins` spins at bet 1, settled like the server. */
export function playFeature(g: PantherGame, cfg: PantherCfg, spins: number): number {
  const cap = maxWinOf(cfg);
  const sessionCap = typeof cfg.maxFsSessionSpins === "number" ? cfg.maxFsSessionSpins : 0;
  const bombCap =
    typeof cfg.maxFsBombMult === "number" && cfg.maxFsBombMult > 0 ? cfg.maxFsBombMult : Infinity;
  let left = spins;
  let played = 0;
  let win = 0;
  let acc = 0;
  while (left > 0) {
    const s = g.spin({ ante: false, isFreeSpins: true, acc: g.sumRule ? 0 : acc });
    win = +(win + Math.min(s.totalWin, cap)).toFixed(2);
    acc = g.sumRule ? acc + s.bombAccumulator : Math.min(bombCap, s.bombAccumulator);
    played += 1;
    left = Math.max(0, left - 1 + Math.max(0, s.retriggerSpins));
    if (sessionCap > 0) left = Math.min(left, Math.max(0, sessionCap - played));
    if (played > 500) break; // runaway guard for uncapped sessions
  }
  return Math.min(g.finalize(win, acc), cap);
}

/** Scale every pay symbol's table (scatter and bomb untouched). */
export function withPayScale(cfg: PantherCfg, scale: number): PantherCfg {
  const out = structuredClone(cfg);
  for (const s of out.symbols) {
    if (s.scatter || s.bomb) continue;
    s.pay = s.pay.map((p) => Math.round(p * scale * 100) / 100) as [number, number, number];
  }
  return out;
}

export function scatterOf(cfg: PantherCfg): Sym {
  return cfg.symbols.find((s) => s.scatter)!;
}
