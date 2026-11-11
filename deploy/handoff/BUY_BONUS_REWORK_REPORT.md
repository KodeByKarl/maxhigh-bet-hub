# Buy Bonus rework - client reference (Bet, Quantity, Price, Total Price, Buy & Play)

Supersedes the fixed-10 rule of `BUY_BONUS_FINAL_INVENTORY.md`. Branch `ci/staging-artifact-buy-bonus-modal-redesign`. Not deployed, not pushed.

## What the client reference establishes (implemented)
* Dialog fields: Bet (P), Quantity, Price (per unit), Total Price, Buy & Play, Cancel.
* Example: base bet 1, quantity 1 -> price 42.50, total 42.50, wallet debit 42.50, bonus plays at the 1 base bet. Verified live (API + ledger + browser).
* 42.5 is each template slot's own per-unit price (`buyFeatureMult`), NOT a global multiplier. Realms titles keep their own calibrated per-spin curves; Wild Panther keeps its own locked flow.

## Architecture
* `src/lib/buy-bonus.ts`: per-game `BuyBonusSpec` (`unit`, `quantity: locked | range`). `resolveBuyBonusQuantity(gameId, requested, maxOverride)` is the single server validator; `buyBonusTotal(bet, mult, qty)` is the single price formula used by the server AND the UI, so displayed == charged.
* Trigger / quantity / pricing stay separate: spec (quantity), each game's own pricing module (`pantherBuyPricePerSpin`, `realmsBuyPricePerSpin`), handler (wallet).
* Default spec: range 1..25 (25 = every template slot's default `maxFsSessionSpins`; the live per-game cap is still enforced by the handler; Realms narrows to `realmsBuyMaxQuantity`).
* Wild Panther: spec `locked 10` (its own flow and 41x flat total are unchanged).
* No per-box mechanic exists in code and none was invented: `BuyBonusUnit` has only `"free-spin"`.
* Wallet, ledger, RTP, payout, locks, permissions untouched.

## Results
| Check | Result |
|---|---|
| `tsc --noEmit`, `vite build` | pass |
| `npm run test:unit` (incl. new `buy-bonus-spec`, updated `buy-bonus-modal` x80 themes) | all pass |
| API sweep, disposable loopback clone, **80 games**, 748 checks | **0 failed** (out-of-spec quantity refused free; qty 1 purchasable; duplicate purchase = 1 debit / 1 session; settled once; replay refused; wallet = start - price + payout) |
| Client example, 29 template slots | bet 1 x qty 1 debited exactly 42.50, 1 free spin, session bet = base bet |
| Browser (desktop + mobile): Golden Panther, Abyssal Pearls, Zeus Strike, Moonwell Mysteries, Wild Panther | dialog fields, Total = Price x Qty, counter 1/N..N/N for purchased N |
Screenshots: `output/buy-bonus-rework/`.
Not re-run: the "forced scenario" section of the API test (retrigger/caps), and browser runs on every one of the 80 games (one per family + 2 extra).

## Games
* Buy Bonus with quantity selector (free-spin units, game-specific price): 29 template slots + 50 Realms = **79**.
* Fixed free spins (locked 10, own flow): Wild Panther (1).
* Per-box: **0 implemented** (no reference exists in the repo).
* No Buy Bonus: Fire Spike, Coin Volcano + 7 fishing + 11 cards/table.
* Outside the 100-game catalog: `wild-frontier-stampede` (flat 80x, unrouted) untouched.

## Genuinely unresolved (need the client)
1. Which games are per-box, and what a box is / costs / contains.
2. Reference mechanics for any game whose Buy Bonus is not "quantity of free spins" (special bonus types).
3. Whether Wild Panther's own flow (flat 41x for 10, no quantity) is the intended reference or should also take a quantity.
4. Quantity limits per game (currently 1..25 template, per-title cap on Realms) and the initial quantity (currently 1).
5. Panther curve: `PANTHER_BUY_CURVE` is empty, so template slots are priced flat per spin (42.5 x quantity). Confirm flat pricing is intended, or provide the curve.
6. Stampede: publish or not.

## UAT release (isolated UAT only)
CI (`.github/workflows/staging.yml`) is manual, runs from `main`, `build_only` default true. Nothing was pushed or deployed. Steps for the developer:
1. Review and merge this branch to `main` (or push the branch and open a PR).
2. GitHub > Actions > "Manually deploy isolated staging": confirmation `STAGING ONLY`, `build_only` true -> artifact.
3. On the UAT VPS, follow `DEPLOYMENT_AND_ROLLBACK.md` (needs sudo; backup first; automatic rollback to the previous release if health fails). No migration is part of this change.
4. Then run `node scripts/qa/test-buy-bonus-api.mjs <dir> --skip-forced` against the UAT-equivalent clone, never the public backend.
