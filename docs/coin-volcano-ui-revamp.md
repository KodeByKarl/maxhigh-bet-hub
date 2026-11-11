# Coin Volcano UI revamp

Coin Volcano now uses one content-sized cabinet and console. The controller, resolver, RNG, configuration, APIs and settlement retain their gameplay behavior. Reel presentation uses motion-based downward shuffle and staggered drops; visual Turbo stage durations are long enough for those movements to be seen.

## Changed files

- `src/components/maxhigh/CoinVolcanoSlot.tsx`: keeps the existing state machine and delegates rendering and control callbacks to the dedicated view.
- `src/components/maxhigh/coin-volcano/CoinVolcanoView.tsx`: cabinet, configuration-backed paytable, reward counter, Magma Core Spin, bet controls, settings menu and direct Auto stop.
- `src/components/maxhigh/coin-volcano/volcano-ui.css`: isolated responsive composition, obsidian cabinet, integrated reel surface, molten highlights and motion preferences.
- `src/components/maxhigh/coin-volcano/ReelCell.tsx`: metal reel surface without the orange card overlays; independent rolling strips and staggered landing animation.
- `src/games/coin-volcano/GameView.tsx`: uses Coin Volcano's dedicated presentation instead of the shared skin wrapper.
- `scripts/qa/coin-volcano-ui.mjs`: reproducible browser regression using the actual controller and view, mocked auth/settlement transport, and the real resolver with fixed test grids. It never places live wagers.
- `docs/coin-volcano-ui-revamp.md`: this implementation and verification record.

## Layout and visuals

The old reel section had nested `flex-1` / `h-full` wrappers around an aspect-ratio board, while the controls were a separate shrinking footer. The unused vertical height stayed between the naturally sized board and the footer. These wrappers and the shared rectangular control deck have been replaced by a single content-sized composition.

Portrait uses title → forged cabinet → integrated reward rail → floating console. At desktop widths and short landscape heights, the cabinet and console sit beside each other. Short screens can scroll the composition. Insets reserve room for the parent game close control and device safe areas. There is no elastic spacer between the reels and the controls.

The existing backdrop, symbol images, audio and outcome playback are retained. The 5×3 grid uses a dark continuous surface with subtle metal edges instead of isolated orange cards. Spin has an irregular rounded obsidian shell, molten inner face, ember rim, idle light movement, press feedback, active ring and win flash. All styling is Coin Volcano-specific; no shared UI files were changed.

## Rolling and rewards

Each column uses Framer Motion for a continuous downward symbol shuffle, with row and reel offsets in the transient strips. Final cards drop from above the board with the same motion approach used by Abyssal Pearls, including a stagger, slight compression and eased landing. The final symbols come exclusively from the original playback grid. CSS keyframes no longer control the roll or landing.

- Normal landing: at most 370ms delay + 380ms movement, within the 820ms stopping phase.
- Turbo: 240ms of visible shuffle followed by a 320ms stopping phase; at most 100ms delay + 180ms movement.

The previous 60ms Turbo phases were too short for a readable card drop. Only visual presentation durations were increased; no outcomes, bet calculations, reward calculations or settlement rules changed. Reduced motion uses a short fade instead of travel.

Payline and Wild+Scatter keys highlight only the corresponding authoritative cells. Grand Jackpot highlights all cells only when playback supplies its jackpot flag. The reward counter animates toward the exact supplied amount; it never updates balance or calculates prizes. A short eight-ember eruption accompanies actual large wins. Reduced-motion mode disables moving effects and uses the exact counter value immediately.

## Buy Bonus and configuration

Coin Volcano's config and server handler explicitly define a base-game-only title: no Buy Bonus and no Free Spins. No purchase button or invented bonus session was added. The new Info/Paytable reads the current `cfgSnap` values: line multipliers, bet per line, mix table, Grand multiplier and payout cap. Financial rules and server validation were not modified.

## Verification

Chromium screenshots and geometry assertions passed at:

| Viewport | Result                                      |
| -------- | ------------------------------------------- |
| 320×568  | Connected portrait layout; controls visible |
| 360×640  | Connected portrait layout; controls visible |
| 375×667  | Connected portrait layout; controls visible |
| 390×844  | Connected portrait layout; controls visible |
| 430×932  | Connected portrait layout; controls visible |
| 768×1024 | Centered portrait cabinet                   |
| 1024×768 | Cabinet and console beside each other       |
| 1366×768 | Balanced desktop composition                |
| 844×390  | Compact landscape composition               |

All have 15 cells, no horizontal overflow, no button overlaps, no broken image assets, and visible touch targets of at least 44px. Final symbol containers stay inside the reel surface. Screenshots were visually inspected, including portrait, landscape, landing, mix and jackpot states.

The browser test also passed bet changes, Turbo and Sound controls, keyboard focus restoration, paytable access, duplicate-spin locking, busy controls, authoritative payout display and balance updates, Auto start/stop, settlement failure recovery, visibly changing downward rolling transforms, sampled movement of all 15 cards from above the board into their final positions in normal and Turbo modes, and reduced motion. No browser runtime errors were recorded.

Artifacts: `output/coin-volcano-ui/` contains viewport/state screenshots and `results.json`. `rolling-and-drop.webm` shows normal and Turbo card motion with mocked settlement. `output/coin-volcano-ui-run.log` contains the browser run output. Run again with:

```text
node scripts/qa/coin-volcano-ui.mjs <installed-playwright-package-directory>
```

Additional validation: TypeScript, targeted ESLint, production build and the existing independent payline referee (40,000 Coin Volcano spins and 40,000 Fire Spike spins, zero mismatches). Repository lint reports existing warnings; the changed Coin Volcano components have no lint errors or warnings.

## Skills and limits

The installed skill catalog and local skill directory were inspected. No applicable frontend-design, accessibility or browser-testing skill was installed, so no unrelated skill was invoked. Implementation and verification used the repository's React/TypeScript stack, existing Radix components, Vite and local Playwright/Chromium.

No live account was used and no live wagers or production settlement requests were performed. Live production settlement remains outside this visual regression test. There are no known blockers to the UI change. Other games' uncommitted changes and all `audit/` files were left untouched. Nothing was pushed or deployed.
