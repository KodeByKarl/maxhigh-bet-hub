/** Deal / flip / war / chip timings (ms). Mobile uses faster profile. */
export const AH_ANIM = {
  dealStagger: 220,
  card2Stagger: 180,
  flipDuration: 380,
  warFlash: 450,
  warBurnPause: 320,
  warCardStagger: 200,
  resultHold: 900,
  chipPulse: 200,
  chipFlight: 420,
} as const;

/** Faster timings for phones (majority of players). */
export const AH_ANIM_MOBILE = {
  dealStagger: 120,
  card2Stagger: 100,
  flipDuration: 260,
  warFlash: 280,
  warBurnPause: 180,
  warCardStagger: 120,
  resultHold: 520,
  chipPulse: 140,
  chipFlight: 260,
} as const;

export type AhAnimProfile = {
  dealStagger: number;
  card2Stagger: number;
  flipDuration: number;
  warFlash: number;
  warBurnPause: number;
  warCardStagger: number;
  resultHold: number;
  chipPulse: number;
  chipFlight: number;
};

export function getAceHighAnim(): AhAnimProfile {
  if (typeof window === "undefined") return AH_ANIM;
  const coarse =
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 640px)").matches;
  return coarse ? AH_ANIM_MOBILE : AH_ANIM;
}

export const AH_ASSET = {
  board: "/images/symbols/ace-high/board.png",
  cardBack: "/images/symbols/ace-high/card-back.png",
  cardBackSvg: "/images/symbols/ace-high/card-back.svg",
  symbolDir: "/images/symbols/ace-high",
  cardsDir: "/images/symbols/ace-high/cards",
  chipsDir: "/images/symbols/ace-high/chips",
  soundDir: "/sounds/ace-high",
} as const;

export const AH_CHIP_VALUES = [1, 5, 10, 25, 100, 200, 500] as const;

/** Felt spot positions as % of the play surface (over board art MAIN / TIE / ACE). */
export const AH_SPOT_POS = {
  base: { left: "18%", top: "72%" },
  tie: { left: "50%", top: "70%" },
  ace: { left: "82%", top: "72%" },
} as const;

export type AhBetSpot = keyof typeof AH_SPOT_POS;

const ASSET_VER = "6";

export function aceHighCardSrc(rank: string, suit: string): string {
  return `${AH_ASSET.cardsDir}/${rank}${suit}.png?v=${ASSET_VER}`;
}

export function aceHighChipSrc(value: number): string {
  return `${AH_ASSET.chipsDir}/${value}.png?v=${ASSET_VER}`;
}

export function nearestChipValue(amount: number): number {
  let best: number = AH_CHIP_VALUES[0]!;
  for (const v of AH_CHIP_VALUES) {
    if (v <= amount) best = v;
  }
  return best;
}

/** Warm critical images so first deal / chip tap feels instant on phones. */
export function preloadAceHighCriticalAssets(): void {
  if (typeof window === "undefined") return;
  const urls = [
    `${AH_ASSET.board}?v=${ASSET_VER}`,
    `${AH_ASSET.cardBack}?v=${ASSET_VER}`,
    ...AH_CHIP_VALUES.map((v) => aceHighChipSrc(v)),
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}
