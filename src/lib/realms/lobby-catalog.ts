import type { SlotGame } from "@/lib/games";
import { REALMS_GAMES } from "./catalog";
import { TARGET_RTP, PROFILES } from "./defaults";
const formatMult = (value: number) => value.toLocaleString("en-US") + "x";
/** Lobby catalog rows for the family (appended to slotGames). */
export const REALMS_SLOT_GAMES: SlotGame[] = REALMS_GAMES.map((def) => ({
  id: def.id,
  name: def.name,
  provider: "MaxHigh",
  thumb: `/games/realms-illustrated/${def.id}.webp`,
  category: "slot",
  tag: "New",
  description: def.description,
  // No player reviews yet — GameModal hides the rating row when reviews is 0.
  rating: 0,
  reviews: 0,
  rtp: `${(TARGET_RTP * 100).toFixed(1)}%`,
  volatility: def.volatility,
  maxWin: formatMult(PROFILES[def.volatility].maxWinMult),
  minBet: "₱0.20",
  maxBet: "₱100",
  features: ["Cascading Wins", "Free Spins", "Buy Bonus", "Adjustable Qty", "Multipliers"],
}));
