/** Unique Baccarat card back — burgundy damask, not Ace High green. */
export const BACCARAT_CARD_BACK_SVG = `/images/symbols/baccarat/card-back.svg`;

/** Deal / flip timings (ms). */
export const BC_ANIM = {
  dealStagger: 180,
  cardStagger: 140,
  flipDuration: 420,
  thirdCardPause: 300,
  resultHold: 850,
  chipPulse: 180,
} as const;

export const BC_ANIM_MOBILE = {
  dealStagger: 100,
  cardStagger: 80,
  flipDuration: 280,
  thirdCardPause: 180,
  resultHold: 480,
  chipPulse: 120,
} as const;

export type BcAnimProfile = {
  dealStagger: number;
  cardStagger: number;
  flipDuration: number;
  thirdCardPause: number;
  resultHold: number;
  chipPulse: number;
};

export function getBaccaratAnim(): BcAnimProfile {
  if (typeof window === "undefined") return BC_ANIM;
  const coarse =
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 640px)").matches;
  return coarse ? BC_ANIM_MOBILE : BC_ANIM;
}

export const BC_ASSET = {
  board: "/images/symbols/baccarat/board.png",
  cardBack: "/images/symbols/baccarat/card-back.png",
  cardBackSvg: "/images/symbols/baccarat/card-back.svg",
  symbolDir: "/images/symbols/baccarat",
  cardsDir: "/images/symbols/baccarat/cards",
  chipsDir: "/images/symbols/baccarat/chips",
  soundDir: "/sounds/baccarat",
} as const;

/** Theme tokens — Macau night (distinct from Ace High amber/western). */
export const BC_THEME = {
  feltFrom: "#071428",
  feltMid: "#0c2340",
  feltTo: "#041018",
  rail: "#c9a227",
  player: "#38bdf8",
  banker: "#f43f5e",
  tie: "#34d399",
  ink: "#e8eef8",
} as const;

export const BC_CHIP_VALUES = [1, 5, 10, 25, 100, 200, 500] as const;

export type BcBetSpot = "player" | "banker" | "tie" | "playerPair" | "bankerPair";

const ASSET_VER = "3";

export function baccaratCardSrc(rank: string, suit: string): string {
  return `${BC_ASSET.cardsDir}/${rank}${suit}.png?v=${ASSET_VER}`;
}

export function nearestChipValue(amount: number): number {
  let best: number = BC_CHIP_VALUES[0]!;
  for (const v of BC_CHIP_VALUES) {
    if (v <= amount) best = v;
  }
  return best;
}

/** Warm SVG card-back only — rail chips are SVG components, not PNGs. */
export function preloadBaccaratCriticalAssets(): void {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = `${BC_ASSET.cardBackSvg}?v=${ASSET_VER}`;
}
