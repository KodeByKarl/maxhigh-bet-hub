# Buy Bonus presentation - representative families (branch `feature/buy-bonus-presentation`, NOT merged, NOT deployed)

Scope decided by the owner: keep the calibrated pricing/RTP/server session untouched; implement the presentation in representative families first (Wild Panther 41, one other dedicated slot, one shared Realms slot), test, report, then expand.

## What changed (presentation only)
| File | Change |
|---|---|
| `src/components/maxhigh/bonus/freeSpinsProgress.ts` (new) | Pure helper: `FREE SPINS n/N` from the server session (`played`, `left`); total follows retriggers and the actual purchased/awarded spins |
| `src/components/maxhigh/SlotControlDeck.tsx` | Optional `freeSpinsProgress` prop renders `Free spins n/N` / `FREE SPINS n/N`; falls back to the old count (backward compatible for all other games) |
| `WildPantherSlot.tsx` | Purchase now plays the intro the rest of the family already had: reels drop with the game's own animation, scatters land and glow (game sound), the existing Free Spins announcement opens, then the free spins run automatically from 1/N. Previously the board was swapped instantly and the first free spin started behind the announcement |
| `BuffaloReignSlot.tsx`, `RealmsSlot.tsx` | Counter n/N; counter hidden until the announcement is dismissed; **fix of a pre-existing stall** (below) |
| `scripts/test-bonus-progress.ts` (new, in the unit suite), `scripts/qa/browser-buy-bonus.mjs`, `browser-buy-bonus-edge.mjs`, `codemod-buy-bonus-hud.py`, `audit-buy-bonus.mjs` | tests, audit and the codemod for the rest of the family |

Not touched: pricing (`buyFeatureMult`, per-spin curves), RTP/calibration, the server buy RPCs, wallet/ledger code, payout logic, assets, locked/unlocked states, accounts.

## Architecture findings
1. 29 dedicated slots and the shared Realms component already use one template with `playBuyScatterIntro` (drop, scatter sound, glow, announcement). **Wild Panther was the outlier** (instant board swap). Ace High, Coin Volcano and Fire Spike have no buy flow (as configured). `wild-frontier-stampede` is not in the catalog.
2. **Pre-existing defect in that template (measured on the unmodified build):** the intro awaits the announcement while `busyRef` is still true, and the automatic free-spin effect has no dependency that changes afterwards, so after buying, the free spins do NOT start by themselves; the player is left on "FREE SPIN 10 LEFT" until they press the button. Baseline run of Buffalo Reign: counter never started (7 of 14 checks failed); after adding `buyPresenting` to the effect's dependencies it runs 1/10 -> 10/10 automatically. The same one-line dependency is needed in all 30 template components.
3. The purchase is quantity-priced with calibrated per-spin prices (Buffalo 42.5 per bonus unit; Realms 1.05-8.75 per spin from the measured RTP curve; e.g. Abyssal Pearls bet 1 x 10 spins = 53.00 = 10 x 5.3). These are not whole-feature multipliers and were left as they are.
4. The counter total comes from the server session (`fs_spins_played + free_spins_left`), so a retrigger grows N without resetting the count.

## Test evidence (local disposable clone, compiled build; evidence in `C:\Users\Keydi\maxhigh-evidence\buy-bonus\`)
| Test | Wild Panther | Buffalo Reign | Abyssal Pearls (Realms) |
|---|---|---|---|
| Sequence (confirm, reels spin, scatters, announcement 2.3-2.5 s, first bonus spin ~4 s, counter 1/10 ... 10/10, Total Bonus Win, back to base) - desktop | 13/13 | 14/14 | 14/14 |
| Same sequence at 390x844 phone viewport | 13/13 | 14/14 | 14/14 |
| Edge cases: insufficient balance (message, nothing debited), double/triple-clicked confirm (ONE debit, ONE session), refresh after >= 3/10 (session resumes and finishes), exactly-once debit and payout, wallet = start - price + payout | 11/11 | 11/11 | 11/11 |
| Ledger: exactly one purchase debit equal to the dialog's total, no other debit, payout credited once, wallet reconciles | pass | pass | pass |
Also: unit `test-bonus-progress` 5 checks (1/10..10/10, actual quantity, retrigger growth, scatter moment never advances the counter); full unit suite 24/24; lint 0 errors; typecheck clean.

## Not yet verified / risks
* Natural-trigger retrigger display (n/N growth) is covered by the unit test of the helper and by the server-derived total, but no browser test forced a retrigger (needs a seeded session).
* Maximum-win clamp during a bonus is unchanged server logic; not re-tested here.
* The other 27 dedicated slots are NOT modified yet. The dry run shows all 30 template files match the codemod anchors identically (`python scripts/qa/codemod-buy-bonus-hud.py`).
* Ace High, Coin Volcano, Fire Spike: no buy flow to change; 2 games need game-specific specifications if a buy feature is wanted.
* Sound/animation quality was verified through screenshots and timings, not by ear.

## Proposed next step (needs the owner's go-ahead)
Apply the codemod to the remaining 27 template slots (mechanical, anchors verified), regression-test a sample from each visual family in the browser, run the unit suite, then stage a separate release. Nothing is merged or deployed.
