# Six-game artwork rework - 2026-10-13

Image generation stopped at the built-in tool usage limit. The tool reported a reset on Oct 13 at 1:25 PM Singapore/Philippines time. Availability after reset must be checked; no completion is claimed for pending sets.

| Game | Generated assets | Integration |
| --- | ---: | --- |
| Ruby Raven | 11/11 | Complete |
| Midnight Owl | 6/11 | Pending complete set |
| Lotus Lynx | 0/11 | Pending complete set |
| Honey Hive | 0/11 | Pending complete set |
| Frost Fox | 0/11 | Pending complete set |
| Coral Cobra | 0/11 | Pending complete set |

## Completed Ruby Raven

[Artwork preview](../output/six-art-review/ruby-raven.webp). Ten transparent symbols and a gothic ruby background now load from `public/images/symbols/ruby-raven/*-v20261013.png` and `backdrop-v20261013.webp`. Gameplay and loading backgrounds, fallback path, default premium labels and symbol spacing updated. Payout math unchanged.

[Exact saved paths and prompts](../public/images/symbols/ruby-raven/ART-v20261013.md). Built-in imagegen used. Existing assets retained.

## Resume

49 assets remain. [Pending jobs and exact prompts](six-art-pending.json). Six generated Midnight Owl assets are saved but are not referenced by gameplay until the entire set is ready. The other four games retain their current artwork.

Use `node scripts/rework-six-art.mjs jobs` to list only missing assets. Generate those using the built-in imagegen tool, install each with the script, finalize each complete game, then run `npx tsx scripts/validate-six-art.ts`. A CLI/API fallback requires the user to explicitly choose that path and configure OPENAI_API_KEY.

## Validation

- Ruby Raven active paths, transparency, dimensions and hashes: passed, 11 unique files with no exact matches against retained packs.
- TypeScript: 0 errors. ESLint: 0 errors, 115 existing warnings. Production build: passed.
- Ruby Raven preview visually inspected. No live browser gameplay review performed.
- The prior SFX task is also completed: [gentle sound packs](gentle-sfx-complete.md).
