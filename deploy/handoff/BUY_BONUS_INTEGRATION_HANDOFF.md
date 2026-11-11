# Buy Bonus quantity rework: integration handoff for Terminal 1 (visual redesign)

**Status of the mechanics: PROVISIONAL.** "Quantity = free spins" is implemented for 79 games (29 template slots + 50 Realms) only because the client's one reference (bet 1, quantity 1 -> 42.50) and the pre-existing handlers support it. The client has said some games are **per-box** and others use their own mechanics; none of that is specified or implemented. Do not present this as verified behaviour for all games. Wild Panther keeps its own locked-10 flow.

## Branch and commits
| | |
|---|---|
| Branch | `feature/buy-bonus-quantity-rework` (also still the checked-out `ci/staging-artifact-buy-bonus-modal-redesign` at the same commit) |
| Code commit | `7f96b5c3f582ad6695233323ae97529b4fe90004`, parent `31004ae` |
| Base | `31004ae` = Terminal 1's themed `BuyBonusModal` commit. It is an **ancestor** of this branch; the rework was built on top of it, not beside it. |
| Not pushed | `origin/ci/staging-artifact-buy-bonus-modal-redesign` is still `31004ae`. Nothing merged to main, nothing deployed. |
| Terminal 1 worktree | `D:/Porjects/maxhigh-bet-hub-visual` (`feature/game-layout-redesign`) is at `31004ae`, clean when checked (read-only `git status`). Not touched. |
| Dry run | `git merge-tree --write-tree feature/game-layout-redesign HEAD` -> clean, no conflicts (today's state of both branches). |

## Overlap with Terminal 1's modal (the only real conflict surface)
Files Terminal 1 owns and this commit also edited (additively, themed look untouched):
* `src/components/maxhigh/buy-bonus/BuyBonusModal.tsx` (+140/-18)
* `src/components/maxhigh/buy-bonus/buy-bonus.css` (+97, appended block at the end only)

Files Terminal 1 may also touch for a 100-game redesign (mechanical edits here, no styling):
* 29 x `src/components/maxhigh/<game>/BuyFeatureModal.tsx` + `realms/BuyFeatureModal.tsx` + `wild-panther/BuyFeatureModal.tsx`: now pass `betOptions`, `quantity`, `pricePerUnitMult` and `onConfirm(bet, qty)` to the shared modal; they no longer pass `price`.
* 30 x `*Slot.tsx`: only the `buyCost` line and the `@/lib/buy-bonus` import changed (`BUY_BONUS_FREE_SPINS` -> `BUY_BONUS_DEFAULT_QUANTITY`, `buyBonusTotal`); `RealmsSlot.tsx` also passes `maxQuantity`.
No other Terminal 1 asset (theme.ts, motifs.ts, patterns.ts, art) was changed.

## What must be preserved on integration (do not revert)
1. Server: `resolveBuyBonusQuantity(gameId, data.quantity)` and `buyBonusTotal(...)` in the 30 `*.server.ts` buy handlers. Do not restore `resolveBuyBonusSpins` / fixed 10 (kept only as a deprecated shim for old QA scripts).
2. `src/lib/buy-bonus.ts` (spec registry, validation, price formula). Wild Panther stays `locked 10`.
3. Wallet/ledger/lock code: untouched by this branch; keep it that way.
4. Tests: `scripts/test-buy-bonus-spec.ts` (replaces `test-buy-bonus-fixed-spins.ts`), updated `scripts/test-buy-bonus-modal.ts`, `scripts/run-unit.mjs` entry `buy-bonus-spec`.

## How to bring the controls into Terminal 1's themed modal
**Preferred (Terminal 1 has not changed the two modal files since 31004ae):** cherry-pick `7f96b5c` onto the visual branch from a clean checkout of that branch. It applies cleanly today.

**If Terminal 1 has changed `BuyBonusModal.tsx` / `buy-bonus.css` since:** resolve by *contract*, keeping their markup/styling and re-adding these pieces:

Props (replace `price: number` and `onConfirm: () => void`):
```ts
bet: number;                                  // starting bet
betOptions?: readonly number[];               // game's own bet ladder (BET_STEPS); omitted => static bet
quantity: BuyBonusQuantitySpec;               // {mode:"locked",value} | {mode:"range",min,max,initial}
pricePerUnitMult: (q: number) => number;      // price per unit as multiple of the bet
balance: number;
onConfirm: (bet: number, quantity: number) => void;   // label: "Buy & Play"
onCancel: () => void;
```
Internal state/derivations (all pure, from `@/lib/buy-bonus`): `bet`, `qty` (init `clampBuyBonusQuantity(spec, initial|value)`), `mult = pricePerUnitMult(qty)`, `unitPrice = buyBonusUnitPrice(bet, mult)`, `total = buyBonusTotal(bet, mult, qty)`, `canAfford = balance >= total`.

Required visible content and hooks (tests and QA scripts depend on these exact strings/attributes):
* Labels `Bet (₱)`, `Quantity`, `Price`, `Total Price`, button `Buy & Play`, `Cancel`; unit label `Free Spin`/`Free Spins` from `qty`.
* Bet stepper `[data-bb="bet"]` (− / output / +) only when `betOptions.length > 1`.
* Quantity stepper `[data-bb="quantity"]` with `input[aria-label="Quantity"]` (digits only, clamped on change/blur) only when `quantity.mode === "range"`; locked spec shows the fixed number and no stepper.
* `[data-bb="unit-price"]` and `[data-bb="total-price"]` (whole pesos print without decimals, `formatPrice`).
* `canAfford` disables Buy & Play and shows "Insufficient balance"; the Tab-trap/Escape/focus behaviour is unchanged.
CSS: reuse the appended `.bb-fields/.bb-field/.bb-stepper/.bb-rows/.bb-total-row/.bb-static` block, which only uses Terminal 1's tokens (`--bb-a`, `--bb-s`); restyle freely, keep 44px-ish tap targets and the 360px/short-viewport behaviour (verified at 390x844).

Wrapper contract (per game, unchanged by theming): `quantity={getBuyBonusSpec(gameId).quantity}`, `betOptions={BET_STEPS}`, `pricePerUnitMult={(q) => getBuyUnitPrice(1, q)}` (Realms: its `pricePerSpin` + `maxQuantity`).

## Verification on this branch (focused)
* `tsc --noEmit`: pass. `node scripts/run-unit.mjs`: 26/26 pass (incl. `buy-bonus-spec`, `buy-bonus-modal` over all 80 themes).
* Earlier, same code: 80-game API sweep on the disposable loopback clone, 748 checks, 0 failed; browser captures on Golden Panther, Abyssal Pearls, Zeus Strike, Moonwell Mysteries, Wild Panther (desktop) and Golden Panther (mobile 390x844). Screenshots in the local, gitignored `output/buy-bonus-rework/`.
* After integrating, re-run: `npx tsx scripts/test-buy-bonus-modal.ts`, `npx tsx scripts/test-buy-bonus-spec.ts`, and the API sweep against a loopback clone only.

## Open items (unchanged)
Per-box games and special mechanics (not specified); quantity limits (1..25 template, per-title on Realms) and initial quantity 1; Wild Panther flat 41x; empty `PANTHER_BUY_CURVE` (flat 42.5/spin); Stampede publication. See `BUY_BONUS_REWORK_REPORT.md`.
