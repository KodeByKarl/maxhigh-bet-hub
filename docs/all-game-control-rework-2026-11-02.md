# Controls across all 100 games

The earlier controls rework covered only the original 32 standalone slots. That was a scope error; no games were removed. This extension covers the remaining 68 titles.

| Category | Original titles | Realms titles | Total covered |
| --- | --- | --- | --- |
| Slots | 32 | 50 | 82 |
| Cards | 11 | 0 | 11 |
| Fishing | 7 | 0 | 7 |
| Total | 50 | 50 | 100 |

## Design

All 82 slots now use the redesigned control deck, including the dynamic Realms game view. Each title has its own palette and cabinet/button finish. The slot controls use six shared structural families with individual visual treatments; they are not 82 independent interaction systems.

The 11 card games retain their own chip selectors, betting spots, Deal/Draw/Play/Fold/Cash-out actions, and phase-dependent controls. Their panels and primary/secondary actions have game-specific skins: Art Deco Baccarat, crimson Ace High, jade Lucky 9, perya Color Game, neon Color Game Pro, and separate treatments for the other tables.

The seven fishing games retain their weapon selection, power-ups, auto-fire, and in-arena firing. Each dock has its own surface, palette, button geometry, and active weapon/auto-fire treatment. Selected weapons and auto-fire now expose aria-pressed state.

This is per-game visual identity within shared controls and existing game-specific interactions. It does not mean 100 unrelated button layouts.

## Source

- `src/lib/slot-control-skins.ts`: 82 slot identities.
- `src/components/maxhigh/SlotControlDeck.tsx`: slot controls.
- `src/components/maxhigh/slot-control-deck.css`: original 32 cabinet finishes.
- `src/components/maxhigh/slot-control-realms.css`: 50 additional finishes.
- `src/lib/native-control-skins.ts`: 18 card/fishing identities.
- `src/components/maxhigh/native-game-controls.css` and `native-control-colors.css`: native control treatments.
- `RealmsSlot.tsx` and the table/panel/fishing view adapters connect each control style to its game.

## Verification

- The catalog contains 100 unique IDs; all 100 have a control-style definition and view binding.
- Static React rendering checked all 82 slot skins in idle, spinning, free-spin, and auto-spin states.
- Source comparisons preserve the existing wager/settlement logic and the existing event callbacks, disabled conditions, and values in the card/fishing views.
- TypeScript passed.
- Production build passed. ESLint on this extension reported zero errors and seven warnings.
- The local Home page returned HTTP 200 with 100 game cards after these changes.
- Source backups, migration details, and the 100-row coverage report are in `output/all-game-controls/`.

Fresh browser visual and interaction verification remains incomplete: automatic approval review rejected the headless browser launch with the reason “blocked by policy.” No fresh screenshots or browser-fit claims are made. The static checks are not a substitute for testing all games in a browser.

[100-game coverage report](../output/all-game-controls/coverage.json)
