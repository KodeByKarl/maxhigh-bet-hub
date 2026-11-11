// Unit tests for the Free Spins HUD progress ("FREE SPINS n/N"). Pure logic; presentation only.
import assert from "node:assert/strict";
import {
  formatFreeSpinsProgress,
  freeSpinsProgress,
} from "../src/components/maxhigh/bonus/freeSpinsProgress";

const ok = (n: string) => console.log("PASS", n);

// A 10-spin purchase right after the server session opens: nothing played yet, the first spin is "1/10".
assert.deepEqual(freeSpinsProgress(0, 10, false), { current: 1, total: 10 });
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(0, 10, false)), "1/10");
// While the first spin is playing the server has already settled it (played 1, left 9): still 1/10.
assert.deepEqual(freeSpinsProgress(1, 9, true), { current: 1, total: 10 });
ok("first free spin shows 1/10 both before and during the spin");

// Full 1/10 .. 10/10 progression, spin by spin, while playing and between spins.
const seen: string[] = [];
for (let k = 1; k <= 10; k++) {
  seen.push(formatFreeSpinsProgress(freeSpinsProgress(k, 10 - k, true))!);
  if (k < 10)
    assert.equal(formatFreeSpinsProgress(freeSpinsProgress(k, 10 - k, false)), `${k + 1}/10`);
}
assert.deepEqual(
  seen,
  Array.from({ length: 10 }, (_, i) => `${i + 1}/10`),
);
ok("progression 1/10 .. 10/10 while playing; the next spin is announced as n+1 between spins");

// The scatter-trigger moment consumes NO free spin: with nothing played the counter never advances past 1.
for (const spinning of [false, true]) assert.equal(freeSpinsProgress(0, 10, spinning)!.current, 1);
ok("the scatter presentation (played = 0) never advances the counter");

// The counter uses the ACTUAL spins awarded, not a hard-coded 10.
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(0, 7, false)), "1/7");
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(3, 4, true)), "3/7");
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(0, 25, false)), "1/25");
ok("total follows the purchased / awarded quantity (7, 25 ...), not a global 10");

// Retrigger: the server adds spins, so the total grows while current keeps counting.
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(4, 6, true)), "4/10");
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(5, 8, true)), "5/13"); // +3 retrigger settled with spin 5
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(13, 0, true)), "13/13");
ok("retriggers grow the total (e.g. 5/10 becomes 5/13) without resetting the counter");

// Rest state and bad input.
assert.equal(freeSpinsProgress(10, 0, false)!.current, 10);
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(10, 0, false)), "10/10");
assert.equal(freeSpinsProgress(0, 0, false), null);
assert.equal(freeSpinsProgress(Number.NaN, Number.NaN, true), null);
assert.equal(formatFreeSpinsProgress(null), null);
ok("finished feature rests on N/N; empty or invalid input renders no counter");
// Recovery: a session re-opened from the server carries (fsSpinsPlayed, freeSpinsLeft) and must give the same n/N the live round showed.
// Aurora example: 3 spins bought, 1 played before a reload / dropped response -> played 1, left 2 -> next spin is 2/3.
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(1, 2, false)), "2/3");
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(0, 2, false)), "1/2"); // paid, nothing played yet (interrupted purchase response)
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(5, 8, false)), "6/13"); // recovered after a +3 retrigger had settled
assert.equal(formatFreeSpinsProgress(freeSpinsProgress(29, 1, false)), "30/30"); // last spin under the 30-spin session cap
// the live view and the recovered view agree at every point of a 12-spin session with a retrigger on spin 5
for (let played = 0; played < 16; played++) {
  const left = (played < 5 ? 12 : 16) - played;
  const live = freeSpinsProgress(played + 1, left - 1, true)!; // while spin played+1 is in flight (server already settled it)
  const recovered = freeSpinsProgress(played, left, false)!; // page re-opened just before that spin
  assert.equal(recovered.current, live.current);
}
ok(
  "recovered sessions (reload, interrupted request, re-entry, after retrigger) show the same n/N as the live round",
);
console.log("PASS 6 bonus-progress checks");
