# Integration handoff: stabilization -> mobile-first redesign (one combined UAT release)

## Source
- Branch: `uat/stabilization-20261111` (local; CI copy on `origin/ci/staging-artifact-uat-stabilization-20261111` at `3e1a424`).
- Base: `0b58e6e` (the revision deployed to UAT). `feature/mobile-first-controls` is at `0b58e6e` too, so it has no commits of its own yet.
- Commit chain (oldest first): `f34c958` Buy Bonus exact decimal pricing -> `eb9b2b2` Baccarat / Shark Hunter / Color Game fixes + read-only guard -> `519fda0` prettier -> `3e1a424` guard WebSocket opt-in (**last source change; CI run 43000509615 built and passed on this commit**, artifact SHA-256 `f75c3ae0...46e19`) -> `235e8fc` deploy scripts + docs only -> this handoff doc (docs only).
- Everything is committed; the stabilization worktree is clean. The stabilization artifact is NOT deployed and must not be deployed separately.

## Files stabilization changed (everything else is identical to 0b58e6e)
| File | Why it matters to the mobile work |
|---|---|
| `src/lib/buy-bonus.ts` | exact decimal pricing (`exactProduct2`, `buyBonusTotal`, `buyBonusUnitPriceText`); never re-derive prices elsewhere |
| `src/server/games/wild-panther.server.ts` | server cost uses `exactProduct2`; locked at 10 free spins |
| `src/components/maxhigh/buy-bonus/BuyBonusModal.tsx` | shows exact unit price + 2-dp total; **likely overlap** if the dialog is restyled for phones |
| `src/components/maxhigh/games/baccarat/BettingPanel.tsx` | chip tray wraps (no hidden horizontal scroll) |
| `src/components/maxhigh/games/color-game/ColorGameTable.tsx` | lower-half wheel labels turned 180deg (`rotate-180`) |
| `src/components/maxhigh/games/shark-hunter/SharkHunterGame.tsx` | rod row `flex-wrap` |
| `src/components/maxhigh/games/fishing-shared/FishingSeabed.tsx` | fish skeleton scaled/muted (trench theme only) |
| `scripts/qa/capture-game-skins.mjs` | guarded capture; **likely overlap** |
| `scripts/qa/lib/readonly-guard.mjs`, `scripts/qa/test-readonly-guard.mjs` | verified read-only browser guard (new files) |
| `scripts/test-buy-bonus-spec.ts` | pricing/rounding regression tests |
| `deploy/uat/{upgrade,rollback}-uat2.sh`, `deploy/handoff/*.md` | release tooling and docs (new files) |

## Overlap with the mobile terminal (checked read-only 2026-11-11)
Its uncommitted work: modified `src/games/shared/layouts/SkinnedGame.tsx`; new `src/games/shared/layouts/skin-mobile.css`, `scripts/qa/check-mobile-layout.mjs`.
- **Direct overlap today: none.** Merging is conflict-free.
- **Likely future overlap (resolve by keeping both):** `BuyBonusModal.tsx`, `capture-game-skins.mjs`, and the three table/fishing component files if phone layouts are touched for those games.
- **Indirect:** `src/components/maxhigh/SlotControlDeck.tsx` receives `buyFeature.price` from the shells, which compute it with `buyBonusTotal`; a redesigned Spin Container must keep passing that number through unchanged.
- **Action required in `check-mobile-layout.mjs`:** it opens browsers without the read-only guard. Before it is ever pointed at UAT, install the guard (see `capture-game-skins.mjs`: `GUARDED_CONTEXT_OPTIONS`, `installReadOnlyGuard(..., { allowWebSocketHosts: [harnessHost] })`).

## Safe merge instructions (run in the mobile terminal's own checkout, on `feature/mobile-first-controls`)
```bash
git status --short                       # your uncommitted work is fine; just commit it first if you prefer a clean merge
git log --oneline 0b58e6e..HEAD          # empty = no commits of your own yet
git merge --ff-only uat/stabilization-20261111      # if empty above (fast-forward; keeps your uncommitted files)
# if you already have commits:  git merge --no-ff uat/stabilization-20261111
# On conflict: keep BOTH sides. Never resolve by taking "ours"/"theirs" wholesale in the files listed above.
```
Do not push to `main`, do not deploy, and do not change `src/server/access-policy.server.ts`, `src/server/policy/access-policy.config.ts`, `src/lib/useAccessStatus.ts`, the registry, drizzle migrations or env files: the 50 unlocked / 50 locked allocation is enforced there and in the UAT database.

## Preservation checks after merging (all must pass; they were verified on `3e1a424`)
```bash
grep -q exactProduct2 src/lib/buy-bonus.ts && grep -q exactProduct2 src/server/games/wild-panther.server.ts
grep -q buyBonusUnitPriceText src/components/maxhigh/buy-bonus/BuyBonusModal.tsx
grep -q "flex-1 flex-wrap justify-center" src/components/maxhigh/games/baccarat/BettingPanel.tsx
grep -q "rotate-180" src/components/maxhigh/games/color-game/ColorGameTable.tsx
grep -q "flex flex-wrap gap-1.5 pb-1" src/components/maxhigh/games/shark-hunter/SharkHunterGame.tsx
grep -q "size: \[0.65, 1.05\]" src/components/maxhigh/games/fishing-shared/FishingSeabed.tsx
test -f scripts/qa/lib/readonly-guard.mjs
git diff --name-only 0b58e6e HEAD | grep -i -E "access|restrict|allocation|policy|drizzle|registry|\.env" || echo "allocation/schema/registry untouched"
```
## Required regression tests (combined release gate)
```bash
npm run typecheck && npm run lint && npm run test:unit && npm run build   # unit = 27 jobs incl. buy-bonus-spec, buy-bonus-modal, game-folders, realms-family, security-regressions, wild-panther (locked at 10)
PW_MODULE_DIR=<dir> PW_CHROME=<chrome.exe> node scripts/qa/test-readonly-guard.mjs     # must print "read-only guard verified" BEFORE any browser capture
```
Then push the combined branch only to a new `ci/staging-artifact-*` branch, let CI build the Linux artifact (its integration tests must pass), and deploy once with `deploy/uat/upgrade-uat2.sh` after approval (backup + restore test + auto-revert; rollback with `rollback-uat2.sh`).

## Known state to keep in mind
- Quantity limits for the 79 non-Wild-Panther games are provisional; Wild Panther is fixed at 10.
- Mobile "dead space" above the controls was measured and judged not a defect (board is width-limited and centered); a Spin Container that enlarges boards is the right place to address it.
- The Wild Panther ledger investigation (`~/investigate-wp.sh`) is still waiting for a `sudo` run; unrelated to integration.
