import assert from "node:assert/strict";
import { riskControlsSchema } from "../src/lib/risk-controls";

const input = {
  maxSingleBet: 10000,
  maxDailyPayout: 500000,
  maxWeeklyLimit: 35000,
  autoFlagLargeWins: true,
  largeWinThreshold: 50000,
};

// Regression: Zod previously stripped the weekly limit before the save handler.
assert.deepEqual(riskControlsSchema.parse(input), input);
for (const value of [0, -1, Infinity, NaN, "35000", undefined]) {
  assert.equal(
    riskControlsSchema.safeParse({ ...input, maxWeeklyLimit: value }).success,
    false,
    `Invalid weekly limit accepted: ${String(value)}`,
  );
}
assert.equal(riskControlsSchema.parse({ ...input, maxWeeklyLimit: 0.01 }).maxWeeklyLimit, 0.01);
console.log("PASS: weekly limit is retained and invalid risk values are rejected.");
