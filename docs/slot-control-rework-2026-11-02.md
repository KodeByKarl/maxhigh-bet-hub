# Slot controls: original 32 slots

This documents the initial 32-slot phase. The later [all-game extension](all-game-control-rework-2026-11-02.md) adds the remaining 68 titles and is the current coverage reference.

Replaced the repeated three-box HUD and circular-arrow controls in the original 32 slot games. The other 18 original titles and 50 Realms titles were outside this initial phase; they are now included in the later extension.

The controls use six base families—temple, arcade, wild, storm, forge, and noir—with additional styling for every individual game. Each slot has its own palette, cabinet details, spin-button silhouette, borders, and finish. These are 32 visual identities within a shared interaction system, rather than 32 entirely independent layouts.

Examples include Cleopatra's cartouche button, Honey Hive's hexagonal button, Fortune Tiger's ink treatment, Maya's stepped stone edges, Zeus's lightning-shaped control, and Coin Volcano's coin-like button.

The interface separates balance and win values, keeps the selected bet alongside its controls, and integrates the existing bonus action. Spin, animation skip, auto-spin stop, free-spin counts, turbo, info, and mute retain their existing handlers. Fire Spike and Coin Volcano continue to disable their main spin button while busy rather than claiming to support animation skip.

## Implementation

- `src/components/maxhigh/SlotControlDeck.tsx`
- `src/components/maxhigh/slot-control-deck.css`
- `src/lib/slot-control-skins.ts`
- The original 32 slot view adapters.

Migration and source backups are in `output/spin-ui-rework/`.

## Verification and limitation

- Static React rendering checked all 32 skins and idle, busy, free-spin, and auto-spin states.
- Source comparisons confirmed that game behavior before the rendered return and existing action callbacks were preserved.
- All 252 existing action callbacks were checked against the source backups, including bonus actions.
- TypeScript passed. ESLint reported zero errors and 32 warnings across the slot modules checked.
- Production build passed; the development app responds at http://localhost:8080/.
- Fresh browser validation is **not complete**: starting the headless browser was rejected by automatic approval review with the reason “blocked by policy.” Mobile fit and actual visual appearance must still be checked in a browser. No new screenshots are claimed.

Source/render verification: `output/spin-ui-rework/render-verification.json`.

The `scripts/qa/verify-slot-controls.mjs` browser harness is prepared for when browser execution is available.
