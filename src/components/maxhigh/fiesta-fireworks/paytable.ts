import type { CnySymKind } from "@/lib/fiesta-fireworks-config";
import { getFiestaFireworksConfig } from "./runtimeConfig";

export const ICON_SRC: Record<CnySymKind, string> = {
  sym_10: "/images/symbols/fiesta-fireworks/10.webp?v=3",
  sym_j: "/images/symbols/fiesta-fireworks/j.webp?v=3",
  sym_q: "/images/symbols/fiesta-fireworks/q.webp?v=3",
  sym_k: "/images/symbols/fiesta-fireworks/k.webp?v=3",
  sym_a: "/images/symbols/fiesta-fireworks/a.webp?v=3",
  jug: "/images/symbols/fiesta-fireworks/jug.webp?v=3",
  coins: "/images/symbols/fiesta-fireworks/coins.png?v=3",
  fish: "/images/symbols/fiesta-fireworks/fish.webp?v=3",
  lion: "/images/symbols/fiesta-fireworks/lion.webp?v=3",
  lantern: "/images/symbols/fiesta-fireworks/lantern.png?v=3",
  dragon: "/images/symbols/fiesta-fireworks/dragon.webp?v=3",
  monkey: "/images/symbols/fiesta-fireworks/monkey.webp?v=3",
  extra_scatter: "/images/symbols/fiesta-fireworks/extra_scatter.webp?v=3",
};

/** Full +/- ladder (includes quick picks + higher stakes). */
export const BET_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 400, 600];

/** Quick-pick grid when tapping the bet amount (₱0.50 – ₱100). */
export const QUICK_BETS = [0.5, 1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

/** Bet ladder within configured min/max. */
export function getBetSteps(): number[] {
  const { minBet, maxBet } = getFiestaFireworksConfig();
  return BET_STEPS.filter((s) => s >= minBet - 1e-9 && s <= maxBet + 1e-9);
}

export function getPayFor(kind: CnySymKind): [number, number, number] {
  const s = getFiestaFireworksConfig().symbols.find((x) => x.kind === kind);
  return s ? ([...s.pay] as [number, number, number]) : [0, 0, 0];
}
