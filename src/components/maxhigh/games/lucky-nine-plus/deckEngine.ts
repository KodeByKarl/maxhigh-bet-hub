import {
  BACCARAT_RANKS,
  BACCARAT_SUITS,
  type BaccaratRank,
  type BaccaratSuit,
} from "@/lib/baccarat-config";
import type { LuckyNinePlusConfig } from "@/lib/lucky-nine-plus-config";
import type { L9Rng } from "./rng";

export type PlayingCard = {
  rank: BaccaratRank;
  suit: BaccaratSuit;
  id: string;
};

export type ShoeState = {
  cards: PlayingCard[];
  dealt: number;
};

function buildDeck(deckIndex: number): PlayingCard[] {
  const out: PlayingCard[] = [];
  for (const suit of BACCARAT_SUITS) {
    for (const rank of BACCARAT_RANKS) {
      out.push({ rank, suit, id: `${deckIndex}-${rank}${suit}` });
    }
  }
  return out;
}

export function buildShoe(decks: number): PlayingCard[] {
  const n = Math.max(1, Math.min(8, Math.round(decks)));
  const shoe: PlayingCard[] = [];
  for (let d = 0; d < n; d++) shoe.push(...buildDeck(d));
  return shoe;
}

export function shuffleInPlace(cards: PlayingCard[], rng: L9Rng): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }
}

export function freshShuffledShoe(cfg: LuckyNinePlusConfig, rng: L9Rng): ShoeState {
  const cards = buildShoe(cfg.deckCount);
  shuffleInPlace(cards, rng);
  return { cards, dealt: 0 };
}

export function remaining(shoe: ShoeState): number {
  return Math.max(0, shoe.cards.length - shoe.dealt);
}

export function needsReshuffle(shoe: ShoeState, cfg: LuckyNinePlusConfig): boolean {
  const total = shoe.cards.length;
  if (total <= 0) return true;
  return remaining(shoe) / total <= cfg.reshuffleBelowFraction;
}

export function ensureShoe(shoe: ShoeState | null, cfg: LuckyNinePlusConfig, rng: L9Rng): ShoeState {
  if (!shoe || shoe.cards.length === 0 || needsReshuffle(shoe, cfg)) {
    return freshShuffledShoe(cfg, rng);
  }
  return shoe;
}

export function drawCard(shoe: ShoeState): PlayingCard {
  if (shoe.dealt >= shoe.cards.length) {
    throw new Error("Shoe exhausted");
  }
  const card = shoe.cards[shoe.dealt]!;
  shoe.dealt += 1;
  return card;
}

export function serializeShoe(shoe: ShoeState): { cards: PlayingCard[]; dealt: number } {
  return { cards: shoe.cards.map((c) => ({ ...c })), dealt: shoe.dealt };
}

export function restoreShoe(raw: { cards: PlayingCard[]; dealt: number }): ShoeState {
  return {
    cards: raw.cards.map((c) => ({ ...c })),
    dealt: Math.max(0, Math.floor(raw.dealt)),
  };
}
