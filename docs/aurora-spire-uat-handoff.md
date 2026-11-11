# Aurora Spire: UAT handoff

Status: **ready for UAT** (local commits only; nothing pushed or deployed).

## 1. What changed

| Commit | Summary |
| --- | --- |
| `e40b9f2` | Aurora mobile UI (ice-crystal reel cells, crystal Spin, compact control deck), Frozen Vault Buy Bonus, lifecycle unit test |
| `5807c7b` | Recovery guard, Aurora pricing checks, recovery regression tests |
| (this commit) | This handoff document |

Files (Aurora-specific unless noted):

- `src/games/aurora-spire/aurora-ui.css`: all Aurora presentation, scoped to `[data-game-view="aurora-spire"]`.
- `src/games/aurora-spire/GameView.tsx`: loads the stylesheet, press animation.
- `src/components/maxhigh/buy-bonus/FrozenVaultModal.tsx`, `frozen-vault.css`: Aurora's Buy Bonus dialog.
- `src/components/maxhigh/realms/BuyFeatureModal.tsx`: uses the vault only for `aurora-spire`; every other Realms title keeps the shared modal.
- `src/components/maxhigh/RealmsSlot.tsx` (**shared by all Realms titles**): passes the live config to the modal; Spin and Buy Bonus stay disabled until the stored bonus session has been read (about 10-30 ms in testing, so players do not notice).
- Tests: `scripts/test-aurora-bonus-lifecycle.ts`, `scripts/test-bonus-progress.ts`, `scripts/qa/browser-aurora-recovery.mjs`, `scripts/qa/test-buy-bonus-pricing.mjs` (Aurora section added; existing per-game assertions unchanged), `scripts/run-unit.mjs`.

No server code, RNG, RTP, symbol probabilities, pricing curve or payout mathematics were changed.

## 2. Buy Bonus rules (what the client should expect)

**Purchased Free Spins and naturally triggered Free Spins are the same feature with different lengths.**

| | Natural trigger | Purchase |
| --- | --- | --- |
| How it starts | 4 or more Twin Lights land in the base game | Player buys it from the Buy Bonus bar |
| Spins awarded | **12** (configured) | **Exactly what the player picks, 1 to 25** |
| Scatter cash in the trigger spin | Yes (base game rule) | No |
| Retrigger | 4+ Twin Lights during Free Spins add 4 spins | Same |
| Session cap | 30 spins in total including retriggers | Same |
| Spark Prism multiplier | Strongest one collected is applied once to the feature total (ceiling from config) | Same |
| Maximum win | 5,000x bet | Same |

Price: total = bet x (price per spin for that quantity) x spins. The price per spin rises with the quantity (a longer session is worth more per spin), so there is no single "x bet" for the feature. Each quantity is priced so the expected return is consistent. At a 12-spin purchase the price per spin equals the configured Buy Bonus multiplier (3.25x).

| Spins | Price per spin | Total at bet P1 | Total at bet P5 |
| --- | --- | --- | --- |
| 1 | 1.95x | P1.95 | P9.75 |
| 2 | 2.2x | P4.40 | P22.00 |
| 3 | 2.4x | P7.20 | P36.00 |
| 5 | 2.65x | P13.25 | P66.25 |
| 10 | 3.15x | P31.50 | P157.50 |
| 12 | 3.25x | P39.00 | P195.00 |
| 15 | 3.35x | P50.25 | P251.25 |
| 20 | 3.45x | P69.00 | P345.00 |
| 25 | 3.5x | P87.50 | P437.50 |

Quantities outside 1-25 are refused by the server. The Frozen Vault always shows the spins being bought, the multiplier, the exact total and the natural award ("You are buying exactly N free spins ... A natural trigger awards 12").

## 3. UAT checklist

Use a test player with enough balance (for example P500) and note the starting balance. Check each item on a phone and, where marked, on desktop.

### A. Mobile layout (320, 360, 375, 390, 430 px wide; one landscape phone; one tablet/desktop)
- [ ] Reel board is centred, fully visible, no clipped row, no sideways scrolling.
- [ ] Reel cells are translucent chamfered ice crystals; symbols are large and readable.
- [ ] Controls sit under the board: Balance and Last win, Bet stepper, Turbo / Auto / Info, Buy Bonus bar, Spin crystal on the right.
- [ ] Nothing overlaps; every button is easy to tap (about 44 px).
- [ ] Landscape phone: board on the left, controls on the right, no overlap.
- [ ] With the device's "reduce motion" setting on, animations stop but the layout is unchanged.
- [ ] Known and accepted: on very small phones (320 x 568) the board is about 172 px wide because the 4 x 6 grid has to share the screen with the controls.

### B. Spin and Bet
- [ ] Bet minus / plus change the bet; tapping the bet opens the bet list.
- [ ] Spin: crystal glows on hover/focus, presses in, an energy ring orbits while spinning, brief glow on a win, greyed out when unavailable.
- [ ] Balance drops by the bet and Last win shows any win. Turbo and Auto behave as in other Realms games.

### C. Buy Bonus (Frozen Vault)
- [ ] Tap Buy Bonus: the Frozen Vault opens (not the dark-blue dialog other games use).
- [ ] Bet and spin steppers work; total price follows the table in section 2 exactly.
- [ ] Insufficient balance: the message "Insufficient balance. You need P... more." appears and Buy & Play is disabled; lowering the bet or spins re-enables it.
- [ ] Cancel and Esc close the vault with no charge.
- [ ] Buy & Play: balance drops once by the shown total, the Free Spins announcement appears, then spins play from 1/N to N/N and a Total Bonus Win screen appears.
- [ ] Tab key stays inside the vault; on a short phone the Buy & Play and Cancel buttons stay visible.

### D. Free Spins and rewards
- [ ] Bought 1 spin: exactly one free spin. Bought 3 / 12 / 25 spins: exactly that many (the total can only grow if a retrigger happens; "+4 FREE SPINS" appears).
- [ ] The spin counter reads n/N and N matches the purchase.
- [ ] After the Total Bonus Win, balance = starting balance - price + feature win (one credit only).
- [ ] Natural trigger (play the base game until 4+ Twin Lights land; can take a long time): the bonus starts with 12 spins. This is separate from the purchase.

### E. Recovery
- [ ] Buy 5 spins, reload the page after the counter reaches 2/5: the bonus resumes (3/5 ...) and finishes; no second charge.
- [ ] Close the tab during a bonus and reopen the game: the bonus resumes and settles once.
- [ ] While a bonus is open, trying to buy another is refused ("Finish your current paid feature first").

### F. Ledger reconciliation (back office)
- [ ] One "buy feature xN" debit per purchase, equal to the vault total.
- [ ] At most one "free spins win" credit per bonus.
- [ ] Final balance = start - debit + credit. No open play session remains after completion.

## 4. Test results (observed)

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | clean |
| ESLint on touched files | 0 errors (one warning that already existed in `RealmsSlot.tsx`) |
| Unit suite (`npm run test:unit`) | 28 of 28 jobs pass, including the new lifecycle test |
| Integration (`test-integration.mjs`, throwaway MariaDB on port 19307) | 19 of 19 pass |
| Migrations (`test-migrations.mjs`) | pass |
| Aurora pricing section (quantities 1-25, fractional bet, limits, insufficient balance, duplicates) | 37 of 37 pass |
| Legacy Buy Bonus pricing, all 80 games in the existing list | 80 of 80 pass. 39 ran with the standard access policy; the other 41 are commercially locked and were run on a disposable clone with the access policy switched off (documented test hook) |
| Live ledger reconciliation (1, 3, 6, 12 spins, reload, interrupted response, duplicate purchase) | all reconcile to the cent |
| Responsive (320x568, 360x640, 375x667, 390x844, 430x932, 768x1024, 1024x768, 1366x768, two landscape sizes, reduced motion) | no overflow, centred, no overlaps, targets at least 44 px |
| Other Realms titles (Abyssal Pearls, Sirens Lagoon, Comet Carnival) | Spin and Buy Bonus enabled immediately, spin works, shared Buy Bonus modal |

## 5. Known limitations

- Retriggers and the 5,000x max-win clamp are proven by deterministic tests; they were not observed in the live UI because outcomes are random and must not be forced.
- A naturally triggered 12-spin bonus was not observed live for the same reason; the 12-spin purchase exercises the identical session code.
- After recovering a bonus that was paid but never played, the deck can show a plain spin count for a moment before the n/N counter; settlement is unaffected.
- On a 320 x 568 phone the reel board is small (see 3A).
- The Realms Spin / Buy Bonus loading guard is shared code; it was verified on four titles, not all 50.

## 6. Running the tests

- Unit: `npm run test:unit`.
- Aurora lifecycle only: `node --import tsx scripts/test-aurora-bonus-lifecycle.ts`.
- Pricing (needs the local clone, see `scripts/qa/local-clone.mjs`; set `UAT_BASE`, `UAT_CREDS_FILE`, `DB_URL`):
  `GAMES=aurora-spire SKIP_LEGACY=1 node --import tsx scripts/qa/test-buy-bonus-pricing.mjs out.json`.
  Without those switches it runs the original per-game check against `buy-games.txt`.
- Browser recovery (local demo database only): `PW_MODULE_DIR=... PW_CHROME=... node scripts/qa/browser-aurora-recovery.mjs`.
- The integration and pricing suites need a disposable MariaDB on 127.0.0.1:19307 (root password `audit-local-only`); a native `mariadbd` instance with a fresh data directory works, Docker is not required.
