# Current shared artwork review

Rework completed: both slot pairs now load 34 new symbols, four distinct backgrounds and two distinct frames. All 40 generated assets passed active-path, dimensions, transparency and duplicate-hash checks, including comparison against retained image packs. Seven fishing treasure silhouettes are now differentiated in the existing SVG renderer. See [completion report and previews](distinct-art-complete.md). The findings below preserve the pre-rework audit.

Reviewed 2026-10-12. Scope: Fire Spike/Coin Volcano, Wild Panther/Golden Panther, seven fishing games, Ace High/Baccarat. Static renderer inspection and SHA-256 comparisons; no live gameplay review. This supersedes the broader folder-based findings for fishing and Baccarat.

## Original active duplicates (now replaced)

| Games | Symbols | Background and support |
| --- | --- | --- |
| Fire Spike / Coin Volcano | All seven: bar, dice, diamond, chip, lucky7, wild, scatter | Identical card-frame.png and identical public/images/fire-spike-bg.webp / coin-volcano-bg.webp |
| Wild Panther / Golden Panther | All ten: 10, J, Q, K, A, owl, wolf, ram, scatter, wild | Both reference the same panther/backdrop.webp and panther/loading-bg.webp |

Original evidence: each slot's animationConfig.ts, Wild Panther paytable.ts and WildPantherSlot.tsx, Golden Panther theme.ts and panther-shared/theme.ts. Current references now use per-game `v20261012-unique` assets; Golden Panther no longer uses gpIconPack.

## Fishing: current renderers differ from retained image folders

All seven FishSprite.tsx components use FaunaFish with their own FAUNA cast from games/fishing-shared/fauna.ts. Their Game.tsx files render FishingSeabed with these themes:

| Game | Active seabed |
| --- | --- |
| Deep Bass | lake |
| Dragon Fisher | koi |
| Crab Cannon | reef |
| Shark Hunter | trench |
| Octopus Armada | armada |
| Turtle Tide | lagoon |
| Whale War | arctic |

The active creatures and seabeds are SVG/CSS, not the duplicated fish PNGs and seabed.webp retained in these folders. Comparing serialized FAUNA specifications found no exact cross-game duplicates. They still share drawing primitives and animation code; unique configurations do not prove visually unrelated artwork. Within each game, the `super` tier deliberately aliases `elite` in the cast helper. Crates share a drawing structure with different palettes.

Six games use FishingCannon with per-game weapon skins. Deep Bass uses BoatCannon and its own cannon/bullet/muzzle raster assets. The old fishSpritePath helper references a missing super-bass.png, but the active FishSprite renderer does not use that helper, so this is not evidence of a current broken fish image.

## Ace High / Baccarat: duplicated storage, different active cards

SHA-256 confirms 61 matching raster files: 52 card faces, seven chips, board.png and card-back.png. Their card-back.svg files differ.

Ace High CardIcon.tsx loads its PNG card faces and PNG back, with CSS/SVG fallbacks. AceHighSlot.tsx uses its board image.

Baccarat CardCell.tsx renders IvoryFace in CSS and uses its own burgundy card-back.svg. Its PNG card-face helper has no consumer in the inspected source. The Baccarat board/chip PNG constants do not establish active usage. Thus the 61 retained duplicates do not mean these two games currently show the same deck and table.

## Original audit conclusion and resolution

The two slot pairs required distinct artwork, now implemented. Fishing and Baccarat were not active users of the duplicated PNG packs. Fishing treasure shapes have since been differentiated; Ace High and Baccarat retain their already different active card renderers. Retained unused files remain on disk. This work does not certify visual uniqueness across every one of the 100 games.
