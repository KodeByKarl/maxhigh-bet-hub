# Codex Spin button progress — 41 active slot games

The user approved the corrected scope: **41 active slot games**, excluding the nine active Cards/Fishing games. The original requested document filename is retained for continuity. Work is local, on `codex/game-spin-designs` in `D:/Porjects/maxhigh-spin-buttons`, based on `d51d79c`. No push, merge or deployment is authorized or performed.

## Verified inventory and allocation

Read-only inventory time: 2026-11-16T18:22:23.330Z. Local maxhigh_demo has 0 game_controls rows. Missing rows default to enabled=yes in listSuperGames(). Client-active additionally excludes effective policy locks. There are 50 client-active games: 41 slots and 9 non-slots.

The original working tree has an uncommitted reversal of the committed 50-game policy allocation. This implementation targets the **current working copy** reviewed and approved by the user, not the isolated branch's older committed policy. No access-policy file is changed or copied into this branch. Developer maintenance accounts can see locked titles as enabled; that is distinct from client-active status. Lobby visibility alone is also distinct from play authorization. There are no grant keys, so no signed grants can alter the effective lock list.

Source policy SHA-256: `11d197c17e883072fdcd8789931d6ba0c26522493947408f8a114b84beec8136`. Complete 100-game catalog, database flags, engines, original controls, palettes, premium symbols, thumbnails and eligible file mappings: [CODEX_SPIN_INVENTORY.json](CODEX_SPIN_INVENTORY.json).

Excluded active non-slots: Octopus Armada (octopus-armada, fishing); Turtle Tide (turtle-tide, fishing); Whale War (whale-war, fishing); Tongits Arena (tongits-arena, cards); Royal Climb (lucky-drop, cards); Color Game Pro (color-game-pro, cards); Lucky Nine Plus (lucky-nine-plus, cards); Deluxe Draw (drop-deluxe, cards); Poker Showdown (poker-showdown, cards).

## Implementation and integration

The adapter uses CSS/SVG and original p3.webp artwork. All 41 silhouettes and engraving combinations are distinct. Five material finishes complement the original catalog palettes. The existing native button retains its action label, disabled attribute, focus behavior and sole onClick handler. No React subtree is replaced, no listener/debounce/wager handler is added, and no financial, RNG, auto or turbo logic changes.

Only these runtime files change:

- `src/games/shared/layouts/SkinnedGame.tsx`
- `src/components/maxhigh/spin-button/game-spin-themes.ts`
- `src/components/maxhigh/spin-button/game-spin-button.css`

SkinnedGame imports the isolated stylesheet and merges gameSpinThemeStyle(gameId) into its existing style object; data-spin-treatment and data-spin-finish enable the treatment. This is intentionally a presentation adapter instead of replacing Claude's in-progress controls with a new button component. It works with the standard slot-deck__spin and dedicated native button classes ending in -spin. Keep that class contract when adding consoles. Existing data-busy, data-active or data-state attributes supply feedback. No shared control-deck or per-game layout files are edited.

Claude integration, after user approval: review/cherry-pick the Codex commit into the layout branch, retaining all current GameViews, presets, consoles and policy edits. Resolve only SkinnedGame's small presentation additions if it changes meanwhile. Do not overwrite the control deck. Re-run the browser script against the latest layout snapshot because concurrent edits are not automatically covered by earlier screenshots.

## Per-game batches

Statuses: NOT STARTED, IMPLEMENTED, VERIFIED, BLOCKED. VERIFIED below means all six viewport and synthetic handler checks in this captured UI fixture passed. It does **not** certify real database wager settlement. Shared modified files for every row are the three runtime files above; original per-game control and crest paths appear in CODEX_SPIN_QA.json.

| Batch | Game | Slug | Treatment / finish | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Constellation Keep | constellation-keep | Orion's star keep / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Cinder Crown | cinder-crown | Molten coronation / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Magma Anvil | magma-anvil | Hammered forge plate / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Obsidian Oracle | obsidian-oracle | Obsidian seer's eye / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Salamander Sun | salamander-sun | Salamander solar seal / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Ashfall Citadel | ashfall-citadel | Ashen fortress gate / stone | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Glacier Glyphs | glacier-glyphs | Glacial rune tablet / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Northwind Narwhal | northwind-narwhal | Ivory tusk compass / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Snowglobe Sorcery | snowglobe-sorcery | Enchanted snowglass / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 1 | Frostbound Fjord | frostbound-fjord | Rime-bound drakkar shield / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Polar Prism | polar-prism | Auroral cut crystal / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Orchid Oasis | orchid-oasis | Orchid petal clasp / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Firefly Hollow | firefly-hollow | Hollow lantern / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Canopy Kingdom | canopy-kingdom | Emerald canopy crest / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Monsoon Grove | monsoon-grove | Rain-carved riverstone / stone | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Hummingbird Haven | hummingbird-haven | Ruby hummingbird bloom / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Babylon Gardens | babylon-gardens | Hanging garden terraces / stone | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Persian Peacock | persian-peacock | Turquoise peacock fan / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Celtic Clover Court | celtic-clover-court | Clover court knotwork / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 2 | Shogun Sakura | shogun-sakura | Lacquered sakura war fan / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Longship Raiders | longship-raiders | Bronze longship boss / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Clockwork Cache | clockwork-cache | Vault winding mechanism / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Brass Zeppelin | brass-zeppelin | Airship navigation porthole / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Tesla Tower | tesla-tower | Induction coil terminal / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Gearspring Gala | gearspring-gala | Rose-gold musical watch / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Steamforge Express | steamforge-express | Locomotive pressure valve / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Alchemist Atelier | alchemist-atelier | Alchemist's emerald flask / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Crystal Grimoire | crystal-grimoire | Amethyst book clasp / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Tarot Twilight | tarot-twilight | Twilight tarot arcana / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 3 | Potion Parlor | potion-parlor | Rose elixir stopper / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Hexbound Library | hexbound-library | Hexbound tome seal / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Cosmic Koi | cosmic-koi | Twin-current koi medallion / glass | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Saturn Rings | saturn-rings | Saturn orbital dial / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Rocket Rendezvous | rocket-rendezvous | Rocket mission patch / metal | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Asteroid Miners | asteroid-miners | Star-ore locking collar / stone | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Nebula Nomads | nebula-nomads | Nomad astral compass / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Stag Spirit Glade | stag-spirit-glade | Spirit antler talisman / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Tortoise Treasury | tortoise-treasury | Jade treasury shell / stone | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Crane Pavilion | crane-pavilion | Vermilion pavilion seal / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 4 | Thunderbird Totem | thunderbird-totem | Storm feather totem / wood | VERIFIED | 6/6 viewport checks; see per-check JSON |
| 5 | Monarch Meadow | monarch-meadow | Monarch wing brooch / silk | VERIFIED | 6/6 viewport checks; see per-check JSON |

## Verification evidence and limits

- Exact 41-title mapping, unique frame/engraving geometry and all original crest assets: verified by spin-buttons-summary.mjs.
- Browser: 41/41 verified; 0 blocked. Raw result: output/spin-buttons/browser/report.json; portable per-game summary: [CODEX_SPIN_QA.json](CODEX_SPIN_QA.json).
- Supplemental desktop action checks: 41/41 verified (disabled click suppressed, mouse activation, busy skip without new wager, Space activation). Run spin-buttons-desktop.mjs while the main browser fixture is running.
- Required sizes: 360×800, 390×844, 412×915, 844×390, 768×1024, 1366×768. Tests check viewport bounds, hit-testing, button overlaps, 44px minimum targets and correct rendered artwork/frame mapping.
- Real GameViews and Realms engine from a captured source snapshot are bundled with these three Codex presentation files. Only authentication and Realms RPC boundaries are replaced with deterministic local responses. Outbound traffic and non-GET HTTP requests are blocked. No database wagers are placed.
- At 390×844: disabled while session loads; keyboard focus/Enter; touch Spin; busy label; two immediate activations produce one synthetic request; maximum concurrent requests = 1; Turbo; Auto start/stop; reduced motion. Screenshots cover all six sizes plus button crops and busy states. Full snapshots are local under output/spin-buttons/browser (ignored by Git).
- Screenshot gallery: output/spin-buttons/gallery.png and output/spin-buttons/gallery.html. Tested GameView/console/theme hashes are retained in CODEX_SPIN_QA.json so subsequent Claude edits can be distinguished from the tested snapshot.
- TypeScript: `tsc --noEmit` passed. Full ESLint: passed with 0 errors and 115 existing warnings; changed runtime TS modules: clean.
- Existing unit/referee suites: 30/30 passed. Logs: output/unit-tests.
- Production build: passed; log output/spin-buttons/build.log. Host Node is v26.13.0; repository engines request Node 24.22.2–24.x, so Node 24 CI parity remains unverified.
- Real demo-account wallet settlement, real network retries, free-spin outcomes and server-side idempotency are not re-certified by the synthetic UI fixture. No server/financial files changed. These require separate end-to-end validation if desired; no game is labeled as passing those checks.

## Reproduce

```powershell
node scripts/qa/spin-inventory.mjs D:/Porjects/maxhigh-bet-hub
node scripts/qa/spin-buttons-browser.mjs D:/Porjects/maxhigh-bet-hub
node scripts/qa/spin-buttons-summary.mjs
```

The inventory script accepts only an explicitly local maxhigh_demo connection and uses a read-only transaction. The browser runner requires Playwright; set PLAYWRIGHT_MODULE to its index.mjs path if the existing local browser-tools installation is elsewhere. It captures a source snapshot, then overlays only the three Codex runtime files. Tests proceed in batches of ten, with independent browser contexts. SPIN_QA_GAME selects one slug; SPIN_QA_RESUME=1 retains completed results when resuming the same unchanged source/presentation snapshot. A full rerun is required after relevant changes.

## Commits

Commit identifiers are reported in the final handoff. No merge, push or deployment has been performed.
