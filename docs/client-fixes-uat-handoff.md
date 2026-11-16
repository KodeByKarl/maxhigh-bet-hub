# Client adjustments (Sir Gino) — UAT handoff

Branch: `fix/client-gino-adjustments` (based on `cleanup/workspace-consolidation` @ `20e790f`). Not pushed, not deployed.
All testing was done against the **local demo database** (`maxhigh_demo`) with demo/QA accounts. No production account, balance,
transaction, game configuration or database was touched.

Status vocabulary: **PASS** (tested, works) · **FIXED** (defect reproduced, fixed, re-tested) · **NOT REPRODUCED** (tried, could
not make it fail) · **NOT TESTED** (not exercised) · **BLOCKED** (needs input we do not have).

## 1. What changed

| # | Commit | Summary |
|---|--------|---------|
| 1 | `6e7ece0` | Slots: claim the spin synchronously (stops duplicate wagers on rapid taps) — 31 slot files |
| 2 | `69ec48b` | Slots: claim the Buy Bonus purchase synchronously (stops duplicate purchases) — same 31 files |
| 3 | `bd833a5` | Cards: synchronous in-flight lock on Deal — 7 card tables |
| 4 | `c3c9c82` | Gate of Ra: controls deck above the reel board so the More menu is reachable |
| 5 | `d3bfd6c` | Mobile: ≥16px fields on touch devices, keyboard-aware dialogs, login panel no longer clips |
| 6 | `4763a69` | Super Admin general game sound volume (0–100 %, mute) + unit test |
| 7 | `12401fc` | Deep Bass mobile labels / action row; Three Card Poker Ante label and balance clipping |

No game mathematics, payout tables, RTP, wallet or ledger code is modified. Server code touched: only the new
`src/server/game-sound.server.ts` (sound setting).

## 2. Findings

### Auto Spin (14 reported games)
The reported "Auto Spin does not work" was **NOT REPRODUCED** in any form on desktop or on mobile (touch emulation): in all 14
games Auto starts, counts down, wins/free-spin transitions continue, and Stop works. What *was* reproduced and fixed:

* **Duplicate wagers (FIXED)** — `spin()` set its in-flight flag only after an awaited session lookup; N taps in the same tick
  placed N wagers (12 clicks → 12–14 wagers in 13/14 games; Coin Volcano was already safe). After: exactly 1.
* **Duplicate Buy Bonus purchase (FIXED)** — same race (6 confirms → 6 purchase calls, now 1; verified Fortune Mouse, Thor Thunder).
* **Gate of Ra Auto unreachable on desktop (FIXED)** — More menu painted under the reel board.

Per-game matrix (Auto, count 10, desktop + mobile touch): Buffalo Reign, Cleopatra Gold, Coin Volcano, Fortune Mouse, Fortune Ox,
Fortune Rabbit, Fortune Tiger, Frost Fox, Gate of Ra, Honey Hive, Maya Gold, Siren's Lagoon, Solar Serpent, Thor Thunder — **PASS**.

### Cards and Fishing
Inventory: 11 Cards + 7 Fishing = 18 games; **9 are lobby-visible** (Ace High, Baccarat, Lucky 9, Three Card Poker, Color Game,
Deep Bass, Dragon Fisher, Crab Cannon, Shark Hunter). The other 9 (Tongits Arena, Royal Climb, Color Game Pro, Lucky Nine Plus,
Deluxe Draw, Poker Showdown, Octopus Armada, Turtle Tide, Whale War) are hidden by existing lobby-visibility rules — not changed.

### "1,000 chips"
**BLOCKED — CLIENT SCREENSHOT REQUIRED.** The element was not found in the code, in the lobby/slots/cards/fishing/profile pages
(signed in/out, desktop/mobile), in the nine visible Cards/Fishing games, or in local database content. Nothing was removed or
changed; no balance, chip or wager configuration was touched.

## 3. Sound control design and safety
* Storage: existing `platform_settings` table, **own row id `game-sound`**, JSON in the nullable text column
  `announcement_banner` of that row. Every existing reader/writer of the table filters on `id = 'default'`
  (`wallet.server.ts`, `services.server.ts`, `superadmin/services.server.ts`); the sound code only ever filters on `game-sound`.
  Verified live: saving sound leaves deposit/withdrawal limits, maintenance flag and the real announcement banner byte-identical,
  and saving platform settings leaves the sound value intact.
* No schema change, no production migration. A typed column would be cleaner but forces a migration — decision for the owner.
* `50 %` = the existing built-in level; `null` (never saved) = no change at all; per-source output is capped at 1.0.
* Writes: Super Admin only (server-side `requireSuperadmin`; anonymous, player, agent, master agent rejected). Each save is
  audit-logged as `super.game_sound` (before/after).
* Autoplay/mobile unlock: unchanged by construction — the control never calls `play()`/`resume()`, it only scales volume.

## 4. Verification results (local, demo database)

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) on the committed tree in a clean worktree | PASS |
| ESLint (`src`, config) | PASS — 0 errors (115 pre-existing warnings) |
| Unit/regression suite (`npm test`, 30 jobs incl. new `game-sound`) | PASS 30/30 |
| Production build (`vite build`) | PASS |
| Auto Spin, count 10, 14 games, desktop | PASS 14/14 |
| Auto Spin, count 10, 14 games, mobile touch | PASS 14/14 |
| Auto Spin 50 / 100 / Infinity, 13 games, desktop | PASS 39/39 (Coin Volcano has a single on/off Auto, no count modes) |
| Auto Spin 50 / Infinity, 13 games, mobile touch | PASS 26/26 |
| Manual Stop (no wagers after Stop) | PASS (all runs above: 0 wagers after Stop) |
| Navigate away mid-Auto (no wagers after closing) | PASS (11 games completed this test; other 3 NOT TESTED for this case) |
| Insufficient balance (Auto stops, balance never negative) | PASS in 8 games (Mouse, Gate of Ra, Buffalo, Ox, Rabbit, Tiger, Honey Hive, Siren's Lagoon); NOT TESTED in Cleopatra, Coin Volcano, Frost Fox, Maya Gold, Solar Serpent, Thor (wins kept the balance above the bet) |
| Free-spin transition (buy bonus -> spins -> summary -> Auto resumes) | PASS in Fortune Mouse, Thor Thunder, Siren's Lagoon; NOT TESTED in the other 11 |
| Rapid taps: Spin x24 -> 1 wager (network **and** ledger) | PASS (14 games by network; 5 re-proved by ledger rows) |
| Buy Bonus x6 confirms -> 1 purchase | PASS (Fortune Mouse, Thor Thunder); NOT TESTED elsewhere (Buffalo Reign's own buy dialog differs) |
| Card Deal x6 -> 1 deal (network + ledger) | PASS Baccarat, Lucky 9, Ace High, Three Card Poker, Color Game; desktop and mobile |
| Cards: 3 full rounds each, ledger consistent with balance | PASS the 5 visible card games, desktop + mobile |
| Fishing: 6 shots on real fish -> 6 bet rows, weapon switch, ledger consistent | PASS Deep Bass, Dragon Fisher, Crab Cannon, Shark Hunter, desktop + mobile |
| Login at 360x640 .. 1024x768, portrait/landscape, simulated keyboard | PASS (16 px fields, dialog inside viewport) |
| Roles: player / agent / master agent / super admin sign-in, staff-area gating | PASS |
| Sound: slider + mute, persistence, Super Admin-only write, audit log | PASS |
| Sound: existing audio unchanged until saved (`null` => gain 1) | PASS (unit + browser) |
| Sound: banner/limits untouched by sound save and vice-versa | PASS (byte-identical settings before/after) |
| Sound: autoplay/mobile unlock | NOT TESTED on real devices (headless Chromium reports user activation); unchanged by construction |
| Real on-screen keyboard (iOS Safari / Android Chrome) | NOT TESTED (needs a physical device); simulated by shrinking the viewport |
| Auto Spin as reported by the client | NOT REPRODUCED — only the defects listed in section 2 were found |

`scripts/qa/browser-duplicate-wager.mjs` is the permanent regression check for duplicate wagers (loopback-only guard).

## 5. Known remaining issues (not fixed, not in scope without approval)
* Three Card Poker at 1366x768, betting phase: the Ante/Play spots are partly cut off at the bottom edge of the felt
  (identical before and after this work; the hand/Play/Fold phase is fine).
* The Fortune Rabbit and Gate of Ra "More" menu pops up over the lower-left reel cell on desktop (cosmetic).
* The 9 lobby-hidden Cards/Fishing games were not tested (visibility unchanged).
* A stale `busyRef` claim cannot leak: every early exit between the claim and the existing `busyRef = true` releases it
  (two exits per slot, one catch for Buy). If a new early `return` is ever added in that window it must release the lock too.

## 6. Rollback
Nothing is deployed. To roll back a future deployment: redeploy the previous build artifact (the seven commits are independent of
the database; no migration). To neutralise only the sound feature without redeploying: delete the `platform_settings` row
`id = 'game-sound'` (players revert to built-in volumes at their next refresh/5-minute poll). Per-commit `git revert` is safe
because each commit is self-contained.
