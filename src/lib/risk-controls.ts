import { z } from "zod";

/** Validate every field the risk settings form persists. */
export const riskControlsSchema = z.object({
  maxSingleBet: z.number().finite().positive(),
  maxDailyPayout: z.number().finite().positive(),
  maxWeeklyLimit: z.number().finite().positive(),
  autoFlagLargeWins: z.boolean(),
  largeWinThreshold: z.number().finite().positive(),
});
