/**
 * Seeded Mulberry32 RNG — replayable / auditable Turtle Tide shot resolution.
 */

export type TurtleTideRng = {
  seed: string;
  next(): number;
  nextInt(maxExclusive: number): number;
  chance(p: number): boolean;
  pickWeighted<T extends { weight: number }>(items: T[]): T;
  range(min: number, max: number): number;
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string): TurtleTideRng {
  let state = hashSeed(seed) || 1;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    nextInt(maxExclusive: number) {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    chance(p: number) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
    pickWeighted<T extends { weight: number }>(items: T[]): T {
      const total = items.reduce((s, it) => s + Math.max(0, it.weight), 0);
      if (total <= 0) return items[0]!;
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, it.weight);
        if (r <= 0) return it;
      }
      return items[items.length - 1]!;
    },
    range(min: number, max: number) {
      if (max <= min) return min;
      return min + next() * (max - min);
    },
  };
}

export function newShotSeed(prefix = "db"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}
