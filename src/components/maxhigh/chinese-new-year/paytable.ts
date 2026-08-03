import type { CnySymKind } from "@/lib/chinese-new-year-config";
import { getChineseNewYearConfig } from "./runtimeConfig";

export const ICON_SRC: Record<CnySymKind, string> = {
  sym_10: "/images/symbols/chinese/10.png",
  sym_j: "/images/symbols/chinese/j.png",
  sym_q: "/images/symbols/chinese/q.png",
  sym_k: "/images/symbols/chinese/k.png",
  sym_a: "/images/symbols/chinese/a.png",
  jug: "/images/symbols/chinese/jug.png",
  coins: "/images/symbols/chinese/coins.png",
  fish: "/images/symbols/chinese/fish.png",
  lion: "/images/symbols/chinese/lion.png",
  lantern: "/images/symbols/chinese/lantern.png",
  dragon: "/images/symbols/chinese/dragon.png",
  monkey: "/images/symbols/chinese/monkey.png",
  extra_scatter: "/images/symbols/chinese/extra_scatter.png",
};

/** Full +/- ladder (includes quick picks + higher stakes). */
export const BET_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 400, 600];

/** Quick-pick grid when tapping the bet amount (₱0.50 – ₱100). */
export const QUICK_BETS = [0.5, 1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

/** Bet ladder within configured min/max. */
export function getBetSteps(): number[] {
  const { minBet, maxBet } = getChineseNewYearConfig();
  return BET_STEPS.filter((s) => s >= minBet - 1e-9 && s <= maxBet + 1e-9);
}

export function getPayFor(kind: CnySymKind): [number, number, number] {
  const s = getChineseNewYearConfig().symbols.find((x) => x.kind === kind);
  return s ? ([...s.pay] as [number, number, number]) : [0, 0, 0];
}
