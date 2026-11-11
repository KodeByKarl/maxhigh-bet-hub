# Distinct Realms thumbnails

Replaced all 50 Realms lobby thumbnails with individually generated artwork and title lettering using built-in imagegen. Each title has an individual prompt specifying its subject, illustration style, typography, and composition. The set moves away from repeated gold block lettering and coin piles toward nautical prints, botanical painting, woodcuts, retro space posters, neon, calligraphy, and other themes appropriate to each title.

Final assets: `public/games/realms-illustrated/<game-id>.webp` (50 files, 768 × 768).

Prompt manifest: [prompts.json](../output/realms-thumbnail-distinct-2026-11-01/prompts.json).

Previous thumbnails: `output/realms-thumbnail-distinct-2026-11-01/previous/`.

Inventory: [inventory.json](../output/realms-thumbnail-distinct-2026-11-01/inventory.json).

All 50 files were decoded and validated, with 50 unique content hashes and no missing replacements. Reviewed all five contact sheets for composition and title readability. A request to the running app for the Tesla Tower replacement returned HTTP 200 with image/webp. The broader catalog audit still finds zero missing thumbnails across all 100 catalog titles; enabled database flags remain unverified because the database connection is refused.

No gameplay code or game settings were changed.

## Contact sheets

![Ocean and celestial](../output/realms-thumbnail-distinct-2026-11-01/review-1.png)

![Volcanic and frost](../output/realms-thumbnail-distinct-2026-11-01/review-2.png)

![Jungle and ancient](../output/realms-thumbnail-distinct-2026-11-01/review-3.png)

![Clockwork and arcane](../output/realms-thumbnail-distinct-2026-11-01/review-4.png)

![Cosmos and spirit](../output/realms-thumbnail-distinct-2026-11-01/review-5.png)
