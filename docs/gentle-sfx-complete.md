# Gentle per-game SFX packs - 2026-10-13

All 100 registered games now reference their own generated WAV pack under `public/sounds/gentle-v1/<game>/`. Solar Serpent is included. This is procedural audio synthesis performed locally, not an AI audio-generation service.

899 unique WAV recordings: 817 SFX recordings and 82 separate ambient clips. The audit reports 808 configured event types; the climb event selects ten recordings. Every file has a distinct SHA-256 hash. Original sound files remain on disk but the registered audio modules now use the new directories.

The generator uses gently faded, decaying sine notes with restrained harmonic partials. It produces no saw/square waves, continuous motor drone, crackling noise or buzzing noise beds. Each game has its own deterministic pitch, scale, timing, decay and timbre recipe. Some games still share a musical style; unique files do not mean that every recording sounds completely unrelated.

Maximum digital sample peak is 0.17 (about -15.4 dBFS). Quick effects peak at 0.11; ambient clips at 0.065. The slot playback layer caps volume at 0.7, defaults to 0.45, limits overlap to six clips and cancels active spin clips on stop. Perceived comfort still depends on device volume and the listener; no headphone listening review was performed.

The shared slot factory and both color-wheel adapters use the new playback layer. Wild Panther also uses its own gentle pack. The wheel's original visual easing and slice-boundary timing remain intact, with minimum tick spacing to avoid rapid rattling. Card and fishing modules point at their own packs, preserving their event APIs. Drop Deluxe now has its missing lose sound.

[Listen locally](http://localhost:8080/sound-preview.html). The page and Solar Serpent WAV endpoint were verified to return HTTP 200. Select a game and an event to compare them.

## Evidence

- [All generated files, recipes' event names, digital peaks and hashes](gentle-sfx-manifest.json)
- [Updated game-by-game SFX audit](game-sfx-audit.md)
- [Generator](../scripts/generate-gentle-game-sounds.mjs)
- [File/level validation](../scripts/validate-gentle-sounds.mjs): passed, 100 games and 899 unique valid WAVs; all mapped files exist and have faded edges
- [Playback regression tests](../scripts/test-gentle-audio.ts): passed unlock, per-game paths, bounded overlap, mute, spin cancellation and volume limits
- TypeScript: 0 errors. ESLint: 0 errors, 115 existing warnings. Production build: passed.

The original pre-rework audio-map snapshot is retained at `output/sfx-audit/original-audit.json` so the generator can reproduce the same event inventory. Re-run the generator and validator to reproduce the packs and listening page. No deployment performed.
