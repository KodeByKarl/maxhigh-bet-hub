# Abyssal Pearls artwork rework

Replaced Abyssal Pearls' flat badge artwork with individually generated dimensional ocean illustrations using built-in imagegen.

- Background: underwater ruins, coral gardens, jellyfish and filtered light, with an open dark center for reel readability.
- Low symbols: sculpted sea-glass/mother-of-pearl 10, J, Q, K and A in distinct colors.
- Premium symbols: giant oyster, anglerfish and kraken eye.
- Special symbols: a luminous opal pearl scatter and a water-pressure multiplier orb.
- Loading: connected Abyssal to the game-style splash screen using its illustrated cover, replacing the old giant diamond badge loader.
- Reel cells: subtle navy/pearl wells and win highlights, scoped only to Abyssal Pearls.

Final files are saved in `public/images/symbols/realms/abyssal-pearls-v20261102/`: `backdrop.webp` and the ten `l1`–`l5`, `p1`–`p3`, `scatter`, and `bomb` WebP assets. Symbol images are 512×512 with transparency; the background is 1920×1080. Versioned asset URLs prevent the old badge files from being reused from cache.

The existing lobby cover was retained. Symbol IDs, rank labels, paytable, engine weights and settlement logic were not changed. Other Realms titles keep their own asset paths.

## Preview and prompts

![New symbols and background](../output/abyssal-art-rework/art-review.png)

- [Full generation prompts and source paths](../output/abyssal-art-rework/prompts.json)
- [Saved-file inventory](../output/abyssal-art-rework/inventory.json)
- [Asset and HTTP checks](../output/abyssal-art-rework/verification.json)

All ten symbols were checked for transparency and successful image decoding. Every referenced asset URL returned HTTP 200. Source checks confirm the new splash profile is connected and other Realm asset paths are unchanged. Fresh browser visual verification has not been performed because headless browser execution was blocked earlier in the session.

TypeScript and production build passed. ESLint reported zero errors and one hook-dependency warning in the shared Realms view.
