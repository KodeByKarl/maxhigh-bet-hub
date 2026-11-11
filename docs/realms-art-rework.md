# Realms artwork rework

Scope: the 50 Realms slots, including Abyssal Pearls. Each title receives a separate portrait loading illustration, landscape reel background, five sculpted rank symbols (10, J, Q, K, A), three premium object symbols, a scatter, and a multiplier symbol.

Completed on 2026-11-05: all 600 images generated and all 50 complete packs installed. The artwork gallery and ten world contact sheets include every title. Visual review is recorded in `output/realms-art-rework/visual-review.json`.

Generation uses built-in imagegen with one request per asset. The complete prompt set is saved in `output/realms-art-rework/prompts.json`. Each successful generation persists its original source path under `output/realms-art-rework/generated/`.

Run `node scripts/qa/install-realms-art.mjs` to validate and install completed packs. Versioned runtime assets live under `public/images/symbols/realms/<game-id>-v20261102-r2/`. A title becomes active in `src/lib/realms-art-ready.json` only after its entire pack is present. This prevents partial generation from introducing broken symbol references.

Run `node scripts/qa/check-realms-art.mjs --complete --http` against localhost:8080 to validate all 50 packs and their served URLs. The inventory records dimensions, file sizes, transparency, and SHA-256 hashes.

Loading screens use the dedicated scene artwork, with a readable loading console and responsive portrait/landscape treatment. Reel panels use quieter borders and translucent wells to emphasize the illustrated symbols. Existing engine symbol IDs, card ranks, weights, payouts, bets, and spin handling remain unchanged.

The loading screen decodes the title's background and ten reel symbols alongside its loading illustration before revealing the game, with the existing eight-second fallback retained.

`output/realms-art-rework/progress.json` records generated and installed counts. `pending-prompts.json` contains only unfinished assets. Generation metadata is saved after every image so an interrupted chat can resume without repeating completed work. Seventeen unrecorded images from interrupted runs were visually reviewed, matched to their game roles, and marked as recovered in their metadata.

Use `node scripts/qa/review-realms-art.mjs` for world contact sheets and `node scripts/qa/preview-realms-art.mjs` for the local artwork gallery. These are asset reviews; they do not represent browser screenshots.
