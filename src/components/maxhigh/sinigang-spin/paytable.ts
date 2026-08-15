import type { CnySymKind } from "@/lib/sinigang-spin-config";
import { getSinigangSpinConfig } from "./runtimeConfig";

export const ICON_SRC: Record<CnySymKind, string> = {
  sym_10: "/images/symbols/sinigang-spin/10.webp?v=3",
  sym_j: "/images/symbols/sinigang-spin/j.webp?v=3",
  sym_q: "/images/symbols/sinigang-spin/q.webp?v=3",
  sym_k: "/images/symbols/sinigang-spin/k.webp?v=3",
  sym_a: "/images/symbols/sinigang-spin/a.webp?v=3",
  jug: "/images/symbols/sinigang-spin/jug.webp?v=3",
  coins: "/images/symbols/sinigang-spin/coins.png?v=3",
  fish: "/images/symbols/sinigang-spin/fish.webp?v=3",
  lion: "/images/symbols/sinigang-spin/lion.webp?v=3",
  lantern: "/images/symbols/sinigang-spin/lantern.png?v=3",
  dragon: "/images/symbols/sinigang-spin/dragon.webp?v=3",
  monkey: "/images/symbols/sinigang-spin/monkey.webp?v=3",
  extra_scatter: "/images/symbols/sinigang-spin/extra_scatter.webp?v=3",
};

/** Full +/- ladder (includes quick picks + higher stakes). */
export const BET_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 400, 600];

/** Quick-pick grid when tapping the bet amount (₱0.50 – ₱100). */
export const QUICK_BETS = [0.5, 1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

/** Bet ladder within configured min/max. */
export function getBetSteps(): number[] {
  const { minBet, maxBet } = getSinigangSpinConfig();
  return BET_STEPS.filter((s) => s >= minBet - 1e-9 && s <= maxBet + 1e-9);
}

export function getPayFor(kind: CnySymKind): [number, number, number] {
  const s = getSinigangSpinConfig().symbols.find((x) => x.kind === kind);
  return s ? ([...s.pay] as [number, number, number]) : [0, 0, 0];
}
