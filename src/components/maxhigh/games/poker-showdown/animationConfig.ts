/**
 * Poker Showdown animation + asset paths.
 * Card faces / chips reuse the shared baccarat pack — do not duplicate PNGs.
 */

/** Deal / flip / decision timings (ms). */
export const TCP_ANIM = {
  dealStagger: 160,
  cardStagger: 130,
  flipDuration: 400,
  decisionHold: 200,
  dealerRevealPause: 280,
  resultHold: 900,
  chipPulse: 180,
} as const;

export const TCP_ANIM_MOBILE = {
  dealStagger: 90,
  cardStagger: 70,
  flipDuration: 260,
  decisionHold: 120,
  dealerRevealPause: 160,
  resultHold: 520,
  chipPulse: 120,
} as const;

export type TcpAnimProfile = {
  dealStagger: number;
  cardStagger: number;
  flipDuration: number;
  decisionHold: number;
  dealerRevealPause: number;
  resultHold: number;
  chipPulse: number;
};

export function getThreeCardPokerAnim(): TcpAnimProfile {
  if (typeof window === "undefined") return TCP_ANIM;
  const coarse =
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 640px)").matches;
  return coarse ? TCP_ANIM_MOBILE : TCP_ANIM;
}

/**
 * Shared card/chip pack lives under baccarat.
 * Sounds reuse Three Card Poker stubs under /sounds/threecardpoker.
 */
export const TCP_ASSET = {
  board: "/images/symbols/baccarat/board.png",
  cardBack: "/images/symbols/baccarat/card-back.png",
  cardBackSvg: "/images/symbols/baccarat/card-back.svg",
  symbolDir: "/images/symbols/baccarat",
  cardsDir: "/images/symbols/baccarat/cards",
  chipsDir: "/images/symbols/baccarat/chips",
  soundDir: "/sounds/threecardpoker",
} as const;

/** Theme tokens — Vegas high-roller: dark emerald felt, mahogany rail, gold leaf. */
export const TCP_THEME = {
  feltLit: "#1a8759",
  feltFrom: "#0f6e47",
  feltMid: "#084a30",
  feltTo: "#031b10",
  railWood: "#5a3016",
  railWoodMid: "#3a1c0b",
  railWoodDark: "#140702",
  rail: "#c9a227",
  gold: "#e8c96a",
  goldBright: "#f7e3a1",
  player: "#f6e7bd",
  dealer: "#f4b8c7",
  ante: "#f5d67a",
  pairPlus: "#8fd3ff",
  ink: "#f7f3e8",
} as const;

export const TCP_CHIP_VALUES = [1, 5, 10, 25, 100, 200, 500] as const;

export type TcpBetSpot = "ante" | "pairPlus";

const ASSET_VER = "1";

export function tcpCardSrc(rank: string, suit: string): string {
  return `${TCP_ASSET.cardsDir}/${rank}${suit}.png?v=${ASSET_VER}`;
}

export function nearestChipValue(amount: number): number {
  let best: number = TCP_CHIP_VALUES[0]!;
  for (const v of TCP_CHIP_VALUES) {
    if (v <= amount) best = v;
  }
  return best;
}

export function preloadThreeCardPokerCriticalAssets(): void {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = `${TCP_ASSET.cardBackSvg}?v=${ASSET_VER}`;
}
