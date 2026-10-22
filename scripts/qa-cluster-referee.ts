/**
 * Independent referee for every cluster-tumble slot (Panther family + Realms).
 * Recomputes each spin's payout from the boards alone and compares it with what
 * the engine paid — same referee for both families, so they must win the same way.
 *
 *   npx tsx scripts/qa-cluster-referee.ts            (all 80)
 *   QA_SPINS=20000 npx tsx scripts/qa-cluster-referee.ts jade-jaguar
 */
import { LOBBY_VISIBLE_GAME_IDS } from "../src/lib/playable-games";
import { REALMS_GAMES, realmsDefaultConfig } from "../src/lib/realms";
import { resolveSpin as resolveRealms } from "../src/components/maxhigh/realms/engine/spinResolver";
import { createEngineCtx } from "../src/components/maxhigh/realms/engine/types";

type Sym = { id: string; pay: [number, number, number]; scatter?: boolean; bomb?: boolean };
type Cell = { key: string; sym: Sym; mult?: number } | null;
type Step = {
  board: Cell[];
  winningKeys: string[];
  tumbleWin: number;
  afterFall: Cell[];
  spawnedKeys: string[];
};
type Script = {
  initialBoard: Cell[];
  steps: Step[];
  totalWin: number;
  scatters: number;
  scatterPay: number;
  freeSpinsAwarded: number;
  retriggerSpins: number;
  bombAccumulator: number;
};
type Cfg = {
  minCluster: number;
  maxWinMult: number;
  maxBaseBombSum: number;
  maxFsBombMult: number;
  freeSpinsTriggerCount: number;
  freeSpinsRetriggerCount: number;
  freeSpinsBase: number;
  freeSpinsRetrigger: number;
  scatterCashTiers: { count: number; mult: number }[];
};
type Game = {
  id: string;
  /** "strongest" = current Panther/Realms rule; "sum" = Wild Panther's older collect-and-add rule. */
  bombRule: "strongest" | "sum";
  family: "Panther" | "Realms";
  cfg: Cfg;
  spin: (o: { bet: number; ante: boolean; isFreeSpins: boolean; acc: number }) => Script;
};

const r2 = (n: number) => +n.toFixed(2);
const capOf = (c: number) => (Number.isFinite(c) && c > 0 ? c : Infinity);
const clampBomb = (m: number) => Math.min(5, Math.max(2, Math.round(m)));

function tierPay(sym: Sym, count: number, min: number): number {
  if (count >= min + 4) return sym.pay[2];
  if (count >= min + 2) return sym.pay[1];
  if (count >= min) return sym.pay[0];
  return 0;
}

/** Clusters on a board: every pay symbol with ≥ minCluster copies anywhere. */
function clustersOf(board: Cell[], min: number, clampBombs = true) {
  const groups = new Map<string, Cell[]>();
  let scatters = 0;
  const bombs: number[] = [];
  for (const c of board) {
    if (!c) continue;
    if (c.sym.scatter) scatters++;
    else if (c.sym.bomb) bombs.push(clampBombs ? clampBomb(c.mult ?? 2) : (c.mult ?? 2));
    else groups.set(c.sym.id, [...(groups.get(c.sym.id) ?? []), c]);
  }
  const wins = [...groups.values()].filter((g) => g.length >= min);
  return { wins, scatters, bombs };
}

function referee(g: Game, s: Script, bet: number, fs: boolean, acc0: number): string | null {
  const { cfg } = g;
  // Wild Panther's engine reports only this spin's bombs; its server adds the running total.
  let acc = g.bombRule === "sum" ? 0 : acc0;
  let paid = 0;
  let maxScat = 0;
  let board = s.initialBoard;
  const cells = board.length;
  for (const [i, st] of s.steps.entries()) {
    if (JSON.stringify(st.board.map((c) => c?.key)) !== JSON.stringify(board.map((c) => c?.key)))
      return `step ${i}: board does not continue from previous tumble`;
    const { wins, scatters, bombs } = clustersOf(
      st.board,
      cfg.minCluster,
      g.bombRule === "strongest",
    );
    maxScat = Math.max(maxScat, scatters);
    if (wins.length === 0) return `step ${i}: tumble without a winning cluster`;
    const raw = wins.reduce(
      (a, w) => a + r2(bet * tierPay(w[0]!.sym, w.length, cfg.minCluster)),
      0,
    );
    let expected = raw;
    const top = bombs.length
      ? g.bombRule === "sum"
        ? bombs.reduce((a, b) => a + b, 0)
        : Math.max(...bombs)
      : 0;
    if (raw > 0 && top > 0) {
      if (fs)
        acc =
          g.bombRule === "sum" ? acc + top : Math.min(capOf(cfg.maxFsBombMult), Math.max(acc, top));
      else
        expected = r2(
          raw * (g.bombRule === "sum" ? top : Math.min(capOf(cfg.maxBaseBombSum), top)),
        );
    }
    if (Math.abs(expected - st.tumbleWin) > 0.011 * (wins.length + 1))
      return `step ${i}: paid ${st.tumbleWin}, referee expects ${r2(expected)}`;
    const winKeys = new Set(wins.flat().map((c) => c!.key));
    for (const k of winKeys)
      if (!st.winningKeys.includes(k)) return `step ${i}: winning cell not removed`;
    // gravity: board size kept, keys unique, survivors kept, no scatter spawned
    if (st.afterFall.length !== cells) return `step ${i}: board size changed`;
    const keys = st.afterFall.map((c) => c?.key);
    if (keys.includes(undefined) || new Set(keys).size !== cells)
      return `step ${i}: hole or duplicate after refill`;
    const removed = new Set(st.winningKeys);
    for (const c of st.board)
      if (c && !removed.has(c.key) && !keys.includes(c.key))
        return `step ${i}: surviving symbol vanished`;
    if (g.bombRule === "strongest")
      for (const c of st.afterFall)
        if (c && st.spawnedKeys.includes(c.key) && c.sym.scatter)
          return `step ${i}: scatter spawned in tumble`;
    paid += st.tumbleWin;
    board = st.afterFall;
  }
  const last = clustersOf(board, cfg.minCluster, g.bombRule === "strongest");
  maxScat = Math.max(maxScat, last.scatters);
  if (last.wins.length > 0 && s.steps.length < 40) return "final board still has a winning cluster";
  if (maxScat !== s.scatters) return `scatter count ${s.scatters}, referee ${maxScat}`;
  let cash = 0;
  if (!fs)
    for (const t of [...cfg.scatterCashTiers].sort((a, b) => b.count - a.count))
      if (maxScat >= t.count) {
        cash = r2(bet * t.mult);
        break;
      }
  if (Math.abs(cash - s.scatterPay) > 0.005) return `scatter cash ${s.scatterPay}, referee ${cash}`;
  const award = !fs && maxScat >= cfg.freeSpinsTriggerCount ? cfg.freeSpinsBase : 0;
  if (award !== s.freeSpinsAwarded)
    return `free spins awarded ${s.freeSpinsAwarded}, referee ${award}`;
  const re = fs && maxScat >= cfg.freeSpinsRetriggerCount ? cfg.freeSpinsRetrigger : 0;
  if (re !== s.retriggerSpins) return `retrigger ${s.retriggerSpins}, referee ${re}`;
  if (fs && Math.abs(acc - s.bombAccumulator) > 1e-9)
    return `FS multiplier ${s.bombAccumulator}, referee ${acc}`;
  const total = Math.min(r2(paid + cash), bet * capOf(cfg.maxWinMult));
  if (Math.abs(total - s.totalWin) > 0.011) return `total ${s.totalWin}, referee ${r2(total)}`;
  return null;
}

const pascal = (id: string) =>
  id
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
const upper = (id: string) => id.toUpperCase().replace(/-/g, "_");

async function pantherGame(id: string): Promise<Game> {
  const lib = (await import(`../src/lib/${id}-config.ts`)) as Record<string, unknown>;
  const rt = (await import(`../src/components/maxhigh/${id}/runtimeConfig.ts`)) as Record<
    string,
    (c: unknown) => void
  >;
  const sr = (await import(`../src/components/maxhigh/${id}/spinResolver.ts`)) as {
    resolveSpin: (o: Record<string, unknown>) => Script;
  };
  const cfg = lib[`DEFAULT_${upper(id)}_CONFIG`] as Cfg;
  rt[`set${pascal(id)}Config`]!(cfg);
  return {
    id,
    bombRule: id === "wild-panther" ? "sum" : "strongest",
    family: "Panther",
    cfg,
    spin: (o) =>
      sr.resolveSpin({
        bet: o.bet,
        ante: o.ante,
        isFreeSpins: o.isFreeSpins,
        collectBombsInFreeSpins: true,
        initialBombAccumulator: o.acc,
      }),
  };
}

function realmsGame(id: string): Game {
  const def = REALMS_GAMES.find((g) => g.id === id)!;
  const cfg = realmsDefaultConfig(id);
  return {
    id,
    bombRule: "strongest",
    family: "Realms",
    cfg,
    spin: (o) =>
      resolveRealms(createEngineCtx(cfg, def.board), {
        bet: o.bet,
        ante: o.ante,
        isFreeSpins: o.isFreeSpins,
        initialBombAccumulator: o.acc,
      }) as unknown as Script,
  };
}

const only = process.argv.slice(2);
const SPINS = Number(process.env.QA_SPINS ?? 6000);
const ids = [...LOBBY_VISIBLE_GAME_IDS, ...REALMS_GAMES.map((g) => g.id)].filter(
  (id) => !only.length || only.includes(id),
);
let bad = 0;
for (const id of ids) {
  const g = REALMS_GAMES.some((r) => r.id === id) ? realmsGame(id) : await pantherGame(id);
  const fails = new Map<string, number>();
  let wins = 0;
  for (let i = 0; i < SPINS; i++) {
    const fs = i % 3 === 2;
    const o = {
      bet: [0.2, 1, 5][i % 3]!,
      ante: !fs && i % 5 === 0,
      isFreeSpins: fs,
      acc: fs ? [0, 2, 3][i % 3]! : 0,
    };
    const s = g.spin(o);
    if (s.totalWin > 0) wins++;
    const err = referee(g, s, o.bet, fs, o.acc);
    if (err)
      fails.set(err.replace(/[\d.]+/g, "#"), (fails.get(err.replace(/[\d.]+/g, "#")) ?? 0) + 1);
  }
  const n = [...fails.values()].reduce((a, b) => a + b, 0);
  if (n) bad++;
  console.log(
    `${n ? "FAIL" : "ok  "} ${g.family.padEnd(7)} ${id.padEnd(22)} spins ${SPINS} wins ${wins}` +
      (n
        ? `  mismatches ${n}: ${[...fails.entries()].map(([k, v]) => `${k} ×${v}`).join("; ")}`
        : ""),
  );
}
console.log(`\n${ids.length - bad}/${ids.length} games: every payout matches the referee`);
process.exit(bad ? 1 : 0);
