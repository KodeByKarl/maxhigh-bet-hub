/**
 * Lucky 9 animation + asset paths.
 * Card faces / chips reuse the shared baccarat pack — do not duplicate PNGs.
 */

/** Deal / flip timings (ms). */
export const L9_ANIM = {
  dealStagger: 180,
  cardStagger: 140,
  flipDuration: 420,
  thirdCardPause: 300,
  resultHold: 850,
  chipPulse: 180,
} as const;

export const L9_ANIM_MOBILE = {
  dealStagger: 100,
  cardStagger: 80,
  flipDuration: 280,
  thirdCardPause: 180,
  resultHold: 480,
  chipPulse: 120,
} as const;

export type L9AnimProfile = {
  dealStagger: number;
  cardStagger: number;
  flipDuration: number;
  thirdCardPause: number;
  resultHold: number;
  chipPulse: number;
};

export function getLucky9Anim(): L9AnimProfile {
  if (typeof window === "undefined") return L9_ANIM;
  const coarse =
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 640px)").matches;
  return coarse ? L9_ANIM_MOBILE : L9_ANIM;
}

/**
 * Shared card/chip pack lives under baccarat.
 * Lucky 9–specific sounds under /sounds/lucky9 (falls back to baccarat copies).
 */
export const L9_ASSET = {
  board: "/images/symbols/baccarat/board.png",
  cardBack: "/images/symbols/baccarat/card-back.png",
  cardBackSvg: "/images/symbols/baccarat/card-back.svg",
  symbolDir: "/images/symbols/baccarat",
  cardsDir: "/images/symbols/baccarat/cards",
  chipsDir: "/images/symbols/baccarat/chips",
  soundDir: "/sounds/lucky9",
} as const;

/** Theme tokens — jade night (distinct from Baccarat navy / Ace High amber). */
export const L9_THEME = {
  feltFrom: "#061a14",
  feltMid: "#0a2e22",
  feltTo: "#03100c",
  rail: "#c9a227",
  player: "#38bdf8",
  dealer: "#a3e635",
  tie: "#fbbf24",
  ink: "#e8f8ef",
} as const;

export const L9_CHIP_VALUES = [1, 5, 10, 25, 100, 200, 500] as const;

export type L9BetSpot = "player" | "dealer" | "tie";

const ASSET_VER = "1";

export function lucky9CardSrc(rank: string, suit: string): string {
  return `${L9_ASSET.cardsDir}/${rank}${suit}.png?v=${ASSET_VER}`;
}

export function nearestChipValue(amount: number): number {
  let best: number = L9_CHIP_VALUES[0]!;
  for (const v of L9_CHIP_VALUES) {
    if (v <= amount) best = v;
  }
  return best;
}

export function preloadLucky9CriticalAssets(): void {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = `${L9_ASSET.cardBackSvg}?v=${ASSET_VER}`;
}
