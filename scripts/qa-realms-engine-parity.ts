/**
 * Parity check: the shared Realms engine must reproduce the repaired
 * cluster-tumble engine spin for spin. Ruby Raven (6×5) is the reference.
 *
 *   npx tsx scripts/qa-realms-engine-parity.ts
 */
import { DEFAULT_RUBY_RAVEN_CONFIG } from "../src/lib/ruby-raven-config";
import { setRubyRavenConfig } from "../src/components/maxhigh/ruby-raven/runtimeConfig";
import { resolveSpin as resolveReference } from "../src/components/maxhigh/ruby-raven/spinResolver";
import { COLS, ROWS } from "../src/components/maxhigh/ruby-raven/types";
import type { RealmsConfig, RealmsSymKind } from "../src/lib/realms/schema";
import { createEngineCtx } from "../src/components/maxhigh/realms/engine/types";
import { resolveSpin } from "../src/components/maxhigh/realms/engine/spinResolver";

/** Reference symbol id → Realms engine id (same order, same math role). */
const ID_MAP: Record<string, RealmsSymKind> = {
  grape: "l1",
  plum: "l2",
  melon: "l3",
  apple: "l4",
  blue: "l5",
  green: "p1",
  purple: "p2",
  heart: "p3",
  lollipop: "scatter",
  bomb: "bomb",
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ref = DEFAULT_RUBY_RAVEN_CONFIG;
const { seedMelonBiasPercent, superBuyFeatureMult: _superBuy, symbols, ...shared } = ref;
const realmsCfg: RealmsConfig = {
  ...shared,
  seedBiasPercent: seedMelonBiasPercent,
  symbols: symbols.map((s) => ({ ...s, id: ID_MAP[s.id], kind: ID_MAP[s.kind] })),
};

setRubyRavenConfig(ref);

const SPINS = 20_000;
const nativeRandom = Math.random;
let mismatches = 0;
let refTotal = 0;
let newTotal = 0;

for (let i = 0; i < SPINS; i++) {
  const mode = i % 4; // paid, paid+ante, free spin, free spin with banked bomb
  const opts = {
    bet: 1,
    ante: mode === 1,
    isFreeSpins: mode >= 2,
    initialBombAccumulator: mode === 3 ? 3 : 0,
  };

  Math.random = mulberry32(1000 + i);
  const a = resolveReference({ ...opts, collectBombsInFreeSpins: true });
  Math.random = nativeRandom;

  const b = resolveSpin(
    createEngineCtx(realmsCfg, { cols: COLS, rows: ROWS }, mulberry32(1000 + i)),
    opts,
  );

  refTotal += a.totalWin;
  newTotal += b.totalWin;
  const same =
    a.totalWin === b.totalWin &&
    a.rawWin === b.rawWin &&
    a.steps.length === b.steps.length &&
    a.scatters === b.scatters &&
    a.freeSpinsAwarded === b.freeSpinsAwarded &&
    a.retriggerSpins === b.retriggerSpins &&
    a.bombAccumulator === b.bombAccumulator &&
    a.displayMult === b.displayMult &&
    a.initialBoard.map((c) => ID_MAP[c.sym.id]).join() ===
      b.initialBoard.map((c) => c.sym.id).join();
  if (!same) {
    mismatches += 1;
    if (mismatches <= 5)
      console.error(`mismatch at spin ${i}`, { ref: a.totalWin, realms: b.totalWin });
  }
}

console.log(`spins ${SPINS} · mismatches ${mismatches}`);
console.log(`total win ref ${refTotal.toFixed(2)} · realms ${newTotal.toFixed(2)}`);
process.exit(mismatches === 0 ? 0 : 1);
