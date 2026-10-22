# Completed artwork rework — 16 games

All 16 games now use their own generated artwork: **160 transparent symbols and 16 backgrounds (176 unique images)**. Generated with the built-in imagegen tool. Each game uses its new background for gameplay and loading, and its symbol mapping is shared by the reels and paytable.

Assets are saved under `public/images/symbols/<game-id>/` as `*-v20261012.png` and `backdrop-v20261012.webp`. Symbols are 320×320 PNGs with transparent padding; backgrounds are 1920×1080 WebP. Original files remain available. The new URLs include version parameters for browser cache refresh.

| Game | Review preview | Asset list and prompts |
| --- | --- | --- |
| Safari Gold | [Preview](../output/slot-art-review/safari-gold.webp) | [Assets/prompts](../public/images/symbols/safari-gold/ART-v20261012.md) |
| Buffalo Reign | [Preview](../output/slot-art-review/buffalo-reign.webp) | [Assets/prompts](../public/images/symbols/buffalo-reign/ART-v20261012.md) |
| Prosperity Lion | [Preview](../output/slot-art-review/prosperity-lion.webp) | [Assets/prompts](../public/images/symbols/prosperity-lion/ART-v20261012.md) |
| Fortune Mouse | [Preview](../output/slot-art-review/fortune-mouse.webp) | [Assets/prompts](../public/images/symbols/fortune-mouse/ART-v20261012.md) |
| Fortune Ox | [Preview](../output/slot-art-review/fortune-ox.webp) | [Assets/prompts](../public/images/symbols/fortune-ox/ART-v20261012.md) |
| Fortune Rabbit | [Preview](../output/slot-art-review/fortune-rabbit.webp) | [Assets/prompts](../public/images/symbols/fortune-rabbit/ART-v20261012.md) |
| Fortune Tiger | [Preview](../output/slot-art-review/fortune-tiger.webp) | [Assets/prompts](../public/images/symbols/fortune-tiger/ART-v20261012.md) |
| Lucky Neko | [Preview](../output/slot-art-review/lucky-neko.webp) | [Assets/prompts](../public/images/symbols/lucky-neko/ART-v20261012.md) |
| Cleopatra Gold | [Preview](../output/slot-art-review/cleopatra-gold.webp) | [Assets/prompts](../public/images/symbols/cleopatra-gold/ART-v20261012.md) |
| Desert Riches | [Preview](../output/slot-art-review/desert-riches.webp) | [Assets/prompts](../public/images/symbols/desert-riches/ART-v20261012.md) |
| Gate of Ra | [Preview](../output/slot-art-review/gate-of-ra.webp) | [Assets/prompts](../public/images/symbols/gate-of-ra/ART-v20261012.md) |
| Maya Gold | [Preview](../output/slot-art-review/maya-gold.webp) | [Assets/prompts](../public/images/symbols/maya-gold/ART-v20261012.md) |
| Pharaoh Fire | [Preview](../output/slot-art-review/pharaoh-fire.webp) | [Assets/prompts](../public/images/symbols/pharaoh-fire/ART-v20261012.md) |
| Enchanted Grove | [Preview](../output/slot-art-review/enchanted-grove.webp) | [Assets/prompts](../public/images/symbols/enchanted-grove/ART-v20261012.md) |
| Godly Gates | [Preview](../output/slot-art-review/godly-gates.webp) | [Assets/prompts](../public/images/symbols/godly-gates/ART-v20261012.md) |
| Olympus Wrath | [Preview](../output/slot-art-review/olympus-wrath.webp) | [Assets/prompts](../public/images/symbols/olympus-wrath/ART-v20261012.md) |

## Validation

- All 16 full-set previews visually reviewed.
- `npx tsx scripts/validate-slot-art-rework.ts` passed: actual exported theme paths resolve; all 160 symbols have transparency and correct dimensions; all 16 backgrounds have correct dimensions; all 176 image hashes are unique.
- `npx tsx scripts/audit-slot-artwork.ts` passed: zero affected games outside the Coral Cobra comparison baseline, and no missing files across the 29 audited themes.
- ESLint passed for all 32 changed theme/icon files. Config code lint passed with the pre-existing formatting rule disabled; default display labels were updated without changing payout values.
- Browser gameplay was not exercised during this artwork-only pass. Review previews show assets together, not screenshots of live gameplay.

The prior Zeus Strike, Thor Thunder, Temple Rush and Solar Serpent reworks remain intact. Other shared artwork noted in the original audit (for example Fire Spike/Coin Volcano) is outside this 16-game batch.
