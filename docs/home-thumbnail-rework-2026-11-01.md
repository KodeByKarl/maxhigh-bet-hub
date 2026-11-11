# Home thumbnail correction

The Home screenshots included the original 50 games as well as Realms titles. The previous rework only covered Realms, leaving Fortune Ox, Fortune Tiger, Cleopatra Gold, fishing games, and card games unchanged.

Generated 50 additional original-title thumbnails with built-in imagegen, each with its own scene, typography, and illustration direction. Installed these alongside the 50 redesigned Realms covers under `public/games/home-v20261101/` and updated the exported catalog in `src/lib/games.ts` to use the new URLs. Existing image files remain available at their original paths. Versioned paths prevent old cached thumbnails from being reused.

## Verification

- Installed 100 covers with 100 unique SHA-256 hashes; every image decoded successfully.
- Reviewed all five original-title contact sheets and the earlier five Realms sheets.
- Browser check on `http://localhost:8080/`: 100 Home cards, zero broken images, zero old image URLs.
- TypeScript and ESLint on the modified catalog passed.
- Database connection remains unavailable, so the 100 cards verified are the Home fallback catalog; persisted Enabled flags were not changed or verified.

## Artifacts

- [Browser screenshot](../output/home-thumbnail-rework-2026-11-01/home-browser.png)
- [Browser results](../output/home-thumbnail-rework-2026-11-01/browser-verification.json)
- [All final prompts and source paths](../output/home-thumbnail-rework-2026-11-01/prompts.json)
- [Installed file inventory](../output/home-thumbnail-rework-2026-11-01/inventory.json)

![Review 1](../output/home-thumbnail-rework-2026-11-01/review-1.png)

![Review 2](../output/home-thumbnail-rework-2026-11-01/review-2.png)

![Review 3](../output/home-thumbnail-rework-2026-11-01/review-3.png)

![Review 4](../output/home-thumbnail-rework-2026-11-01/review-4.png)

![Review 5](../output/home-thumbnail-rework-2026-11-01/review-5.png)
