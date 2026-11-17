# Realms 28 overhaul — progress

Each game gets a dedicated console + layout stylesheet (pattern: Frostbound Fjord, Gearspring Gala, Hexbound Library)
instead of the generic Realms deck. Presentation only: Realms owns state, wager guards and every callback.

| # | Game | Status |
|---|------|--------|
| 25 | Hummingbird Haven | VERIFIED (local, 2026-11-17) |
| — | Longship Raiders | NEXT |

## Hummingbird Haven (`hummingbird-haven`)

**Design:** enchanted garden. Deep forest-glass board plate with a slim gold filigree rim, emerald/turquoise controls,
gold labels. Hex tiles keep their shape and artwork; only the tile fill shifts to garden green. Blossom Spin medallion
(emerald dome + gold petal ring) with idle / busy(skip) / auto(stop) / free / disabled states. Portrait: board over a
compact dock. Landscape (phone, tablet, desktop): board left, dock right, centred as one group.

**Modified / added files**
- `src/games/hummingbird-haven/HummingbirdConsole.tsx` (new) — dedicated deck, same props/callbacks as the shared deck
- `src/games/hummingbird-haven/hb-layout.css` (new) — cabinet, board frame, dock, Spin states, toast, dialogs
- `src/games/hummingbird-haven/GameView.tsx` — identity header, imports stylesheet
- `src/components/maxhigh/SlotControlDeck.tsx` — one dispatch line + import
- `src/components/maxhigh/RealmsSlot.tsx` — one `MINI_TOAST_PREFIX` entry (`hb`)
- `scripts/qa/hummingbird-mobile-ui.mjs` (new) — local fixture QA (RPCs stubbed in the bundle; no wallet/DB writes)

**Not touched:** `game.theme.ts`, every file under `public/` (symbols, backgrounds, sounds), engine/RNG/RTP/paylines/
betting limits/wallet/ledger/server wager functions.

**Responsive QA** (`node scripts/qa/hummingbird-mobile-ui.mjs after`): 360x800, 390x844, 412x915, 844x390, 768x1024,
1366x768 plus 320x568, 667x375, 390x667, 360x640, 568x320, 600x600. Asserted per viewport: no horizontal scroll, no
broken images, no button overlap, everything in bounds, targets >= 43px, board/deck not overlapping. Auto, Bet and Buy
Bonus dialogs verified on small portrait and landscape. All passed.

**Functional QA** (touch + mouse): bet +/-/select, Sound mute/unmute, Paytable open/close, manual spin with balance and
Last Win update, rapid double-activation (exactly 1 wager, max concurrency 1), Turbo on, Auto start/Stop (no further
wagers after Stop), Buy Bonus cancel / quantity / single purchase, Close/reopen with no wager on mount. All passed.

**Fix found during QA:** a transient absolutely-positioned win element extended the view's scroll area and shifted the
whole cabinet up ~90px after a win. Cabinet root is now `overflow: clip`.

**Screenshots** (gitignored, local): `output/hummingbird-mobile/before-*.png` and `after-*.png`, plus `auto-*`, `bet-*`,
`bonus-*`, `paytable-*`, `win-*`.

**Remaining issues:** none for this game. Pre-existing, unrelated: `tsc` reports 2 errors in the untracked
`src/games/shared/realms-preset/PresetGame.tsx` (bad relative imports); ESLint warning (exhaustive-deps) in
`RealmsSlot.tsx:1085`.

## Hexbound Library

Dedicated enchanted-library cabinet: mahogany board with a double gold rim, violet inner glow and gilt corner studs (7x5 hex grid unchanged); ink-plaque ledger with a rune sigil; Georgia/small-caps typography; hexagonal gold SPIN seal inside a violet/gold rune ring. Spin states: idle (slow glow), busy/Skip (violet, flipping book), Auto (crimson Stop square, pulsing), Free spin (violet), disabled (desaturated). Buy Bonus is shown as "Tome".

Modified / added files (UI only):
- `src/games/hexbound-library/HexConsole.tsx` (new; presentation only, reuses every Realms callback and guard)
- `src/games/hexbound-library/hex-layout.css` (new; scoped to `[data-game-view="hexbound-library"]` and `.hx-*`)
- `src/games/hexbound-library/GameView.tsx` (identity header, stylesheet import)
- `src/components/maxhigh/SlotControlDeck.tsx`, `RealmsSlot.tsx` (routing and mini-toast prefix, one line each)
- `scripts/qa/hexbound-mobile-ui.mjs` (new; local fixture, stubbed RPCs, GET-to-localhost only, no wallet or DB writes)

Screenshots: `output/hexbound-mobile/before-*.png` (6 viewports) and `after-*.png` (12 viewports), plus `auto-*`, `bet-*`, `bonus-*`, `paytable-*`, `win-*`.

Responsive QA (all PASS: no overlaps, no clipped controls, no Sound/Close collision, no horizontal scroll, targets >= 44px, board never overlaps dock): 360x800, 390x844, 412x915, 844x390, 768x1024, 1366x768, plus 320x568, 667x375, 390x667, 360x640, 568x320, 600x600. Auto/Bet/Buy dialogs checked on the short viewports.

Functional QA (touch and mouse, 27 checks, 0 failures, 0 page errors): bet adjust/select, sound mute/unmute, paytable open/close, manual spin with balance and Last Win, rapid double activation (1 wager, max concurrency 1), Turbo, Auto start/stop, Buy Bonus cancel/quantity/single purchase, close and reopen with no wager on mount.

Checks: eslint on touched files has 0 errors (1 pre-existing hook-deps warning in RealmsSlot.tsx); `npm run test:unit` all suites pass; `npm run build` exits 0; `tsc --noEmit` reports only the same 2 errors in untracked `PresetGame.tsx`.

Assets and logic: no asset, `game.theme.ts`, RNG, payout, RTP, bet limit, wallet or server code touched.

Outstanding: QA used the stubbed fixture, not the live demo database through the lobby, and sound was only checked via the mute toggle. A manual demo-account pass is still advisable.

## Continuous queue — games 07–28 (2026-11-17)

User requirement: distinct containers, spin enclosures and button treatments for every game. Existing symbols, backgrounds, icons, music and engine are retained. Earlier entries above describe previous versions.

| # | Game | Status | Design |
|---|---|---|---|
| 07 | magma-anvil | VERIFIED | Forged workbench: riveted iron ledger, inset wager rail, full-width molten strike bar, four independent tool switches. |
| 08 | monarch-meadow | VERIFIED | Botanical crown: separate oval account plaques, butterfly flight pad beside the wager, paired garden actions below. |
| 09 | monsoon-grove | VERIFIED | Rain shelter: canopy-edged ledger, droplet action well at left, wager and weather switches at right, wide bonus basin. |
| 10 | moonwell-mysteries | VERIFIED | Lunar shrine: twin silver readouts above a central moonwell surrounded by four independent arcane tablets; wager beneath. |
| 11 | nebula-nomads | VERIFIED | Survey cockpit: two instrument windows, full-width launch dock, wager rail, segmented flight controls. |
| 12 | northwind-narwhal | VERIFIED | Nautical bridge: chart-like ledger, wide arctic navigation dial on the right, two stacked port controls and a separate bonus rail. |
| 13 | obsidian-oracle | VERIFIED | Oracle altar: a tall obsidian scrying seal at left, right-aligned account and wager tablets, three ritual switches and a full-width information footer. |
| 14 | orchid-oasis | VERIFIED | Spa pavilion: floating ivory account plaques, a quiet full-width wager, central orchid capsule flanked by bonus and rules, two broad poolside switches. |
| 15 | persian-peacock | VERIFIED | Palace throne: a domed jewel spin alcove crowns the panel, with flanking court actions, a gold ledger balcony and mosaic wager/footer rails. |
| 16 | polar-prism | VERIFIED | Prism instrument: a slim vertical refractor spin well, offset wager and three crystal switches, and a full-width aurora bonus strip. |
| 17 | potion-parlor | VERIFIED | Apothecary bench: bottle-label account windows, a tall bubbling flask spin chamber between four shelf cards, with a separate dosage rail. |
| 18 | rocket-rendezvous | VERIFIED | Retro mission console: telemetry ledger, fuel wager beside a turbo switch, long illuminated launch key with a separate auto key, and paired mission cards. |
| 19 | salamander-sun | VERIFIED | Sunrise dais: account horizon, four solar tablets, a round sun disc inside a wide radiant cradle, and a bottom heat wager rail. |
| 20 | saturn-rings | VERIFIED | Orbital salon: a split observatory ledger, slim wager bridge, elliptical ringed spin cradle between auto and bonus towers, two broad navigation tabs. |
| 21 | shogun-sakura | VERIFIED | Sakura courtyard: paper-screen account panel, lacquer wager beam, a vertical red seal inside a torii-like spin enclosure, four flanking wooden plaques. |
| 22 | snowglobe-sorcery | VERIFIED | Winter music box: frosted account windows, a glass globe spin above its wager pedestal, flanking auto/bonus snowbanks and paired lower switches. |
| 23 | stag-spirit-glade | VERIFIED | Spirit clearing: carved account tablets and a separate wager, tall antler-grove spin alcove on the left, four mossy stone actions on the right. |
| 24 | steamforge-express | VERIFIED | Locomotive cab: brass-rimmed pressure readouts, a black enamel wager bar, central flywheel spin control between two valve keys, broad auto and ticket levers. |
| 25 | tarot-twilight | VERIFIED | Velvet reading table: two card-shaped account plaques, a tall gilded spin card between four ritual cards, and a bottom wager ribbon. |
| 26 | tesla-tower | VERIFIED | Electrical laboratory: twin voltmeter windows, an offset power wager, horizontal glass coil spin chamber beside the info switch, two copper circuit levers. |
| 27 | thunderbird-totem | VERIFIED | Storm totem: stacked carved account lintel, central thunder seal crowning a wager beam, four independently carved totem switches along the base. |
| 28 | tortoise-treasury | VERIFIED | Jade treasury: inset gold account cartouches, a shell-shaped spin vault on the right of four jade keys, and a broad bottom coin wager trough. |

### magma-anvil

Forged workbench: riveted iron ledger, inset wager rail, full-width molten strike bar, four independent tool switches.

Modified files: `src/games/magma-anvil/MagmaConsole.tsx`, `src/games/magma-anvil/magma-layout.css`, `src/games/magma-anvil/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/magma-mobile/), [design and original sources](../output/realms-overhaul/magma-anvil/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### monarch-meadow

Botanical crown: separate oval account plaques, butterfly flight pad beside the wager, paired garden actions below.

Modified files: `src/games/monarch-meadow/MeadowConsole.tsx`, `src/games/monarch-meadow/meadow-layout.css`, `src/games/monarch-meadow/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/monarch-mobile/), [design and original sources](../output/realms-overhaul/monarch-meadow/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### monsoon-grove

Rain shelter: canopy-edged ledger, droplet action well at left, wager and weather switches at right, wide bonus basin.

Modified files: `src/games/monsoon-grove/MonsoonConsole.tsx`, `src/games/monsoon-grove/monsoon-layout.css`, `src/games/monsoon-grove/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/monsoon-mobile/), [design and original sources](../output/realms-overhaul/monsoon-grove/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### moonwell-mysteries

Lunar shrine: twin silver readouts above a central moonwell surrounded by four independent arcane tablets; wager beneath.

Modified files: `src/games/moonwell-mysteries/MoonwellConsole.tsx`, `src/games/moonwell-mysteries/moonwell-layout.css`, `src/games/moonwell-mysteries/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/moonwell-mobile/), [design and original sources](../output/realms-overhaul/moonwell-mysteries/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### nebula-nomads

Survey cockpit: two instrument windows, full-width launch dock, wager rail, segmented flight controls.

Modified files: `src/games/nebula-nomads/NebulaConsole.tsx`, `src/games/nebula-nomads/nebula-layout.css`, `src/games/nebula-nomads/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/nebula-mobile/), [design and original sources](../output/realms-overhaul/nebula-nomads/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### northwind-narwhal

Nautical bridge: chart-like ledger, wide arctic navigation dial on the right, two stacked port controls and a separate bonus rail.

Modified files: `src/games/northwind-narwhal/NarwhalConsole.tsx`, `src/games/northwind-narwhal/narwhal-layout.css`, `src/games/northwind-narwhal/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/northwind-mobile/), [design and original sources](../output/realms-overhaul/northwind-narwhal/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### obsidian-oracle

Oracle altar: a tall obsidian scrying seal at left, right-aligned account and wager tablets, three ritual switches and a full-width information footer.

Modified files: `src/games/obsidian-oracle/OracleConsole.tsx`, `src/games/obsidian-oracle/oracle-layout.css`, `src/games/obsidian-oracle/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/obsidian-mobile/), [design and original sources](../output/realms-overhaul/obsidian-oracle/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### orchid-oasis

Spa pavilion: floating ivory account plaques, a quiet full-width wager, central orchid capsule flanked by bonus and rules, two broad poolside switches.

Modified files: `src/games/orchid-oasis/OrchidConsole.tsx`, `src/games/orchid-oasis/orchid-layout.css`, `src/games/orchid-oasis/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/orchid-mobile/), [design and original sources](../output/realms-overhaul/orchid-oasis/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### persian-peacock

Palace throne: a domed jewel spin alcove crowns the panel, with flanking court actions, a gold ledger balcony and mosaic wager/footer rails.

Modified files: `src/games/persian-peacock/PeacockConsole.tsx`, `src/games/persian-peacock/peacock-layout.css`, `src/games/persian-peacock/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/persian-mobile/), [design and original sources](../output/realms-overhaul/persian-peacock/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### polar-prism

Prism instrument: a slim vertical refractor spin well, offset wager and three crystal switches, and a full-width aurora bonus strip.

Modified files: `src/games/polar-prism/PrismConsole.tsx`, `src/games/polar-prism/prism-layout.css`, `src/games/polar-prism/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/polar-mobile/), [design and original sources](../output/realms-overhaul/polar-prism/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### potion-parlor

Apothecary bench: bottle-label account windows, a tall bubbling flask spin chamber between four shelf cards, with a separate dosage rail.

Modified files: `src/games/potion-parlor/ParlorConsole.tsx`, `src/games/potion-parlor/parlor-layout.css`, `src/games/potion-parlor/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/potion-mobile/), [design and original sources](../output/realms-overhaul/potion-parlor/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### rocket-rendezvous

Retro mission console: telemetry ledger, fuel wager beside a turbo switch, long illuminated launch key with a separate auto key, and paired mission cards.

Modified files: `src/games/rocket-rendezvous/RocketConsole.tsx`, `src/games/rocket-rendezvous/rocket-layout.css`, `src/games/rocket-rendezvous/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/rocket-mobile/), [design and original sources](../output/realms-overhaul/rocket-rendezvous/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### salamander-sun

Sunrise dais: account horizon, four solar tablets, a round sun disc inside a wide radiant cradle, and a bottom heat wager rail.

Modified files: `src/games/salamander-sun/SalamanderConsole.tsx`, `src/games/salamander-sun/salamander-layout.css`, `src/games/salamander-sun/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/salamander-mobile/), [design and original sources](../output/realms-overhaul/salamander-sun/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### saturn-rings

Orbital salon: a split observatory ledger, slim wager bridge, elliptical ringed spin cradle between auto and bonus towers, two broad navigation tabs.

Modified files: `src/games/saturn-rings/SaturnConsole.tsx`, `src/games/saturn-rings/saturn-layout.css`, `src/games/saturn-rings/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/saturn-mobile/), [design and original sources](../output/realms-overhaul/saturn-rings/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### shogun-sakura

Sakura courtyard: paper-screen account panel, lacquer wager beam, a vertical red seal inside a torii-like spin enclosure, four flanking wooden plaques.

Modified files: `src/games/shogun-sakura/ShogunConsole.tsx`, `src/games/shogun-sakura/shogun-layout.css`, `src/games/shogun-sakura/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/shogun-mobile/), [design and original sources](../output/realms-overhaul/shogun-sakura/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### snowglobe-sorcery

Winter music box: frosted account windows, a glass globe spin above its wager pedestal, flanking auto/bonus snowbanks and paired lower switches.

Modified files: `src/games/snowglobe-sorcery/SnowglobeConsole.tsx`, `src/games/snowglobe-sorcery/snowglobe-layout.css`, `src/games/snowglobe-sorcery/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/snowglobe-mobile/), [design and original sources](../output/realms-overhaul/snowglobe-sorcery/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### stag-spirit-glade

Spirit clearing: carved account tablets and a separate wager, tall antler-grove spin alcove on the left, four mossy stone actions on the right.

Modified files: `src/games/stag-spirit-glade/StagConsole.tsx`, `src/games/stag-spirit-glade/stag-layout.css`, `src/games/stag-spirit-glade/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/stag-mobile/), [design and original sources](../output/realms-overhaul/stag-spirit-glade/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### steamforge-express

Locomotive cab: brass-rimmed pressure readouts, a black enamel wager bar, central flywheel spin control between two valve keys, broad auto and ticket levers.

Modified files: `src/games/steamforge-express/SteamforgeConsole.tsx`, `src/games/steamforge-express/steamforge-layout.css`, `src/games/steamforge-express/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/steamforge-mobile/), [design and original sources](../output/realms-overhaul/steamforge-express/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### tarot-twilight

Velvet reading table: two card-shaped account plaques, a tall gilded spin card between four ritual cards, and a bottom wager ribbon.

Modified files: `src/games/tarot-twilight/TarotConsole.tsx`, `src/games/tarot-twilight/tarot-layout.css`, `src/games/tarot-twilight/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/tarot-mobile/), [design and original sources](../output/realms-overhaul/tarot-twilight/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### tesla-tower

Electrical laboratory: twin voltmeter windows, an offset power wager, horizontal glass coil spin chamber beside the info switch, two copper circuit levers.

Modified files: `src/games/tesla-tower/TeslaConsole.tsx`, `src/games/tesla-tower/tesla-layout.css`, `src/games/tesla-tower/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/tesla-mobile/), [design and original sources](../output/realms-overhaul/tesla-tower/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### thunderbird-totem

Storm totem: stacked carved account lintel, central thunder seal crowning a wager beam, four independently carved totem switches along the base.

Modified files: `src/games/thunderbird-totem/ThunderbirdConsole.tsx`, `src/games/thunderbird-totem/thunderbird-layout.css`, `src/games/thunderbird-totem/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/thunderbird-mobile/), [design and original sources](../output/realms-overhaul/thunderbird-totem/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.

### tortoise-treasury

Jade treasury: inset gold account cartouches, a shell-shaped spin vault on the right of four jade keys, and a broad bottom coin wager trough.

Modified files: `src/games/tortoise-treasury/TortoiseConsole.tsx`, `src/games/tortoise-treasury/tortoise-layout.css`, `src/games/tortoise-treasury/GameView.tsx`.

Responsive and functional QA: 12 viewports, 27 checks, zero page errors. Includes portrait, landscape, tablet, desktop; all targets >=43px, no overlaps, overflow, broken images or offscreen controls. Touch and mouse: bet +/-/select, manual spin, last win/balance display, double activation (one request, concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, sound toggle, info, close/reopen. RPCs stubbed; no real wagers or database writes. Audible playback not manually assessed.

Evidence: [screenshots/results](../output/tortoise-mobile/), [design and original sources](../output/realms-overhaul/tortoise-treasury/). Before: `before-*.png`; after: `after-*.png`; result: `after-results.json`.
