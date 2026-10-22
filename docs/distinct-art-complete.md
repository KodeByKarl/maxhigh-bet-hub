# Distinct artwork rework completed

Follow-up: the project-wide TypeScript and lint errors mentioned in the original validation section below have since been fixed. TypeScript, ESLint (0 errors, 115 warnings), production build, and both artwork validators now pass. See [error-scan resolution](project-error-scan.md).

Completed 2026-10-12 for the four requested groups. The four slots now have their own active artwork. Seven fishing games also have distinct treasure pickup silhouettes. Ace High and Baccarat retain their already different active card designs.

## New slot artwork

| Game | Direction | New files | Preview |
| --- | --- | ---: | --- |
| Fire Spike | Steel, crimson crystal, blue furnace fire | 7 symbols + frame + background | [View](../output/distinct-art-review/fire-spike.webp) |
| Coin Volcano | Molten gold, obsidian, volcanic treasure | 7 symbols + frame + background | [View](../output/distinct-art-review/coin-volcano.webp) |
| Wild Panther | Silver, emerald foliage, moonlit rainforest | 10 symbols + background | [View](../output/distinct-art-review/wild-panther.webp) |
| Golden Panther | Royal gold, amber, sunlit jungle palace | 10 symbols + background | [View](../output/distinct-art-review/golden-panther.webp) |

40 standalone assets generated with the built-in imagegen tool. Saved under `public/images/symbols/<game>/` with the suffix `-v20261012-unique.png` or `.webp`. Symbols and frames are transparent 320 x 320 PNGs; backgrounds are 1920 x 1080 WebP. Both Panther games now use their own background for loading as well. Fallback paths and exported theme maps were updated. Originals are retained but are no longer referenced by these slot renderers.

[Exact prompt set and saved paths](distinct-art-prompts.json). Each asset also has a sibling JSON file recording its prompt and original generated source path.

## Fishing and cards

[Fishing treasure preview](../output/distinct-art-review/fishing-treasures.png), left to right:

- Deep Bass: lure case
- Dragon Fisher: pearl pedestal
- Crab Cannon: coral treasure
- Shark Hunter: anchor
- Octopus Armada: sunken wooden chest
- Turtle Tide: pearl shell
- Whale War: ice crystal

These extend the existing SVG artwork. Each game's fish cast and seabed were already separately themed. Shared drawing code remains; this does not mean every fish anatomy or animation is unrelated. The super/elite alias within each game remains unchanged.

Ace High uses PNG faces and a PNG back, with fallbacks. Baccarat uses CSS ivory faces and its own burgundy SVG back. The duplicated legacy PNG deck in Baccarat's folder is not used by its current card-face renderer.

## Validation

- `node scripts/install-distinct-art.mjs`: passed 40-file dimension, alpha and uniqueness checks; integrated references and saved previews.
- `npx tsx --tsconfig tsconfig.json scripts/validate-distinct-art.ts`: passed all 40 active paths, distinct hashes, background integration and seven distinct fishing configurations. No generated file duplicates another raster image in retained `public/images` or `public/games` packs.
- `npx tsx --tsconfig tsconfig.json scripts/preview-fishing-treasures.tsx`: seven distinct treasure SVGs rendered successfully.
- All four slot previews and the fishing treasure preview visually inspected.
- Targeted ESLint: zero errors, one existing hook dependency warning in WildPantherSlot. Existing formatting rules disabled for legacy slot files; fishing files passed normal lint.
- Full-project TypeScript check did not pass: unrelated errors include PublicUser.agentPromoted, game registry component exports, admin forms and risk-control types. This is not a clean full-project build claim.

No live browser gameplay test or deployment performed. Payouts and game rules were not changed. Scope is these requested groups, not certification of all 100 titles.
