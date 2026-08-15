/**
 * Poker Showdown hand evaluator — pure classification + comparison.
 * Ranking: Straight Flush > Trips > Straight > Flush > Pair > High Card.
 * Ace high except A-2-3 (wheel straight / straight-flush).
 */

import {
  HAND_CATEGORY_RANK,
  POKER_RANK_VALUE,
  pokerRankValue,
  qualifyThresholdValue,
  type HandCategory,
  type QualifyRank,
  type TcpRank,
  type PokerShowdownConfig,
} from "@/lib/poker-showdown-config";
import type { PlayingCard } from "./deckEngine";

export type HandRank = {
  category: HandCategory;
  /** Category strength 0–5 for quick compare. */
  categoryRank: number;
  /**
   * Descending tiebreak keys within the category.
   * Straight / SF: [straightHigh] (wheel = 3).
   * Trips: [tripsRank].
   * Pair: [pairRank, kicker].
   * Flush / HighCard: [hi, mid, lo].
   */
  tiebreak: number[];
  /** Human label e.g. "Straight Flush", "Queen High". */
  label: string;
  /** Highest card face value in the hand (Ace=14); wheel still reports Ace as 14 for display. */
  highValue: number;
};

function rankName(v: number): string {
  const map: Record<number, string> = {
    14: "Ace",
    13: "King",
    12: "Queen",
    11: "Jack",
    10: "10",
    9: "9",
    8: "8",
    7: "7",
    6: "6",
    5: "5",
    4: "4",
    3: "3",
    2: "2",
  };
  return map[v] ?? String(v);
}

function categoryLabel(category: HandCategory, valuesDesc: number[], pairRank?: number): string {
  switch (category) {
    case "straight-flush":
      return "Straight Flush";
    case "three-of-a-kind":
      return `Three ${rankName(valuesDesc[0]!)}s`;
    case "straight":
      return "Straight";
    case "flush":
      return "Flush";
    case "pair":
      return `Pair of ${rankName(pairRank ?? valuesDesc[0]!)}s`;
    default:
      return `${rankName(valuesDesc[0]!)} High`;
  }
}

/**
 * Detect 3-card straight. Returns the straight-high value used for tiebreaks.
 * A-2-3 (wheel) is a straight with high = 3.
 * A-K-Q is a straight with high = 14.
 */
export function straightHigh(valuesAsc: number[]): number | null {
  if (valuesAsc.length !== 3) return null;
  const [a, b, c] = valuesAsc as [number, number, number];
  // Wheel: A,2,3 → values sorted 2,3,14
  if (a === 2 && b === 3 && c === 14) return 3;
  if (b === a + 1 && c === b + 1) return c;
  return null;
}

export function evaluateHand(cards: readonly PlayingCard[]): HandRank {
  if (cards.length !== 3) {
    throw new Error("Poker Showdown hands require exactly 3 cards");
  }

  const values = cards.map((c) => pokerRankValue(c.rank)).sort((x, y) => x - y);
  const valuesDesc = [...values].sort((x, y) => y - x);
  const suited = cards[0]!.suit === cards[1]!.suit && cards[1]!.suit === cards[2]!.suit;
  const sHigh = straightHigh(values);

  // Trips
  if (values[0] === values[1] && values[1] === values[2]) {
    const category: HandCategory = "three-of-a-kind";
    return {
      category,
      categoryRank: HAND_CATEGORY_RANK[category],
      tiebreak: [values[0]!],
      label: categoryLabel(category, valuesDesc),
      highValue: valuesDesc[0]!,
    };
  }

  // Straight flush
  if (sHigh !== null && suited) {
    const category: HandCategory = "straight-flush";
    return {
      category,
      categoryRank: HAND_CATEGORY_RANK[category],
      tiebreak: [sHigh],
      label: categoryLabel(category, valuesDesc),
      highValue: valuesDesc[0]!,
    };
  }

  // Straight (beats flush in this game)
  if (sHigh !== null) {
    const category: HandCategory = "straight";
    return {
      category,
      categoryRank: HAND_CATEGORY_RANK[category],
      tiebreak: [sHigh],
      label: categoryLabel(category, valuesDesc),
      highValue: valuesDesc[0]!,
    };
  }

  // Flush
  if (suited) {
    const category: HandCategory = "flush";
    return {
      category,
      categoryRank: HAND_CATEGORY_RANK[category],
      tiebreak: valuesDesc,
      label: categoryLabel(category, valuesDesc),
      highValue: valuesDesc[0]!,
    };
  }

  // Pair
  if (values[0] === values[1] || values[1] === values[2] || values[0] === values[2]) {
    let pairRank: number;
    let kicker: number;
    if (values[0] === values[1]) {
      pairRank = values[0]!;
      kicker = values[2]!;
    } else if (values[1] === values[2]) {
      pairRank = values[1]!;
      kicker = values[0]!;
    } else {
      pairRank = values[0]!;
      kicker = values[1]!;
    }
    const category: HandCategory = "pair";
    return {
      category,
      categoryRank: HAND_CATEGORY_RANK[category],
      tiebreak: [pairRank, kicker],
      label: categoryLabel(category, valuesDesc, pairRank),
      highValue: Math.max(pairRank, kicker),
    };
  }

  const category: HandCategory = "high-card";
  return {
    category,
    categoryRank: HAND_CATEGORY_RANK[category],
    tiebreak: valuesDesc,
    label: categoryLabel(category, valuesDesc),
    highValue: valuesDesc[0]!,
  };
}

/** Compare two evaluated hands. Positive = a wins, negative = b wins, 0 = tie. */
export function compareHands(a: HandRank, b: HandRank): number {
  if (a.categoryRank !== b.categoryRank) return a.categoryRank - b.categoryRank;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Dealer qualifies with pair-or-better, OR high-card ≥ configured threshold (default Queen).
 */
export function dealerQualifies(
  hand: HandRank,
  qualifyRank: QualifyRank = "Q",
): boolean {
  if (hand.categoryRank >= HAND_CATEGORY_RANK.pair) return true;
  return hand.highValue >= qualifyThresholdValue(qualifyRank);
}

export function dealerQualifiesWithConfig(
  hand: HandRank,
  cfg: PokerShowdownConfig,
): boolean {
  return dealerQualifies(hand, cfg.dealerQualifyRank);
}

/** Convenience: evaluate + compare card arrays. */
export function compareCardHands(
  playerCards: readonly PlayingCard[],
  dealerCards: readonly PlayingCard[],
): number {
  return compareHands(evaluateHand(playerCards), evaluateHand(dealerCards));
}

export function rankToTcpRank(value: number): TcpRank | null {
  for (const [k, v] of Object.entries(POKER_RANK_VALUE)) {
    if (v === value) return k as TcpRank;
  }
  return null;
}
