# Game SFX audit - 2026-10-13

Static audit of all registered playable games. Counts describe configured SFX event types, not playback frequency or proof that every event fires during gameplay. Sample paths are resolved from each game's audio.ts and animationConfig.ts. Synthesized sounds are Web Audio code, not files. One win event may produce multiple melodies according to payout; one climb event selects ten recordings. Ambient music is counted separately. Ace High Web Speech announcements are additional voice output, excluded from SFX counts.

## Totals

- games: 100
- visibleGames: 48
- synthGames: 0
- sampledGames: 100
- configuredEvents: 808
- sampledEvents: 808
- synthesizedEvents: 0
- ambientProfiles: 82
- referencedFilePaths: 899
- existingReferencedFiles: 899
- uniqueReferencedRecordings: 899
- filesOnDisk: 1085

The 100 registered games include 50 hidden Realms titles and Fire Spike/Coin Volcano outside the current lobby-visible list. Lobby visibility is a source-code configuration, not a database availability check. Old or non-registered game audio files on disk do not count as active registered-game SFX.

## Missing referenced files


## Per-game configuration

| Game | Mode | SFX events | Sample paths | Ambient | Missing | Lobby visible |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| golden-panther | sample | 8 | 8 | 1 | 0 | Yes |
| wild-panther | sample | 8 | 8 | 1 | 0 | Yes |
| jade-jaguar | sample | 8 | 8 | 1 | 0 | Yes |
| ember-tiger | sample | 8 | 8 | 1 | 0 | Yes |
| lotus-lynx | sample | 8 | 8 | 1 | 0 | Yes |
| coral-cobra | sample | 8 | 8 | 1 | 0 | Yes |
| frost-fox | sample | 8 | 8 | 1 | 0 | Yes |
| solar-serpent | sample | 8 | 8 | 1 | 0 | Yes |
| honey-hive | sample | 8 | 8 | 1 | 0 | Yes |
| midnight-owl | sample | 8 | 8 | 1 | 0 | Yes |
| ruby-raven | sample | 8 | 8 | 1 | 0 | Yes |
| lucky-neko | sample | 8 | 8 | 1 | 0 | Yes |
| fortune-tiger | sample | 8 | 8 | 1 | 0 | Yes |
| fortune-ox | sample | 8 | 8 | 1 | 0 | Yes |
| fortune-rabbit | sample | 8 | 8 | 1 | 0 | Yes |
| fortune-mouse | sample | 8 | 8 | 1 | 0 | Yes |
| prosperity-lion | sample | 8 | 8 | 1 | 0 | Yes |
| buffalo-reign | sample | 8 | 8 | 1 | 0 | Yes |
| safari-gold | sample | 8 | 8 | 1 | 0 | Yes |
| cleopatra-gold | sample | 8 | 8 | 1 | 0 | Yes |
| maya-gold | sample | 8 | 8 | 1 | 0 | Yes |
| temple-rush | sample | 8 | 8 | 1 | 0 | Yes |
| pharaoh-fire | sample | 8 | 8 | 1 | 0 | Yes |
| desert-riches | sample | 8 | 8 | 1 | 0 | Yes |
| gate-of-ra | sample | 8 | 8 | 1 | 0 | Yes |
| zeus-strike | sample | 8 | 8 | 1 | 0 | Yes |
| thor-thunder | sample | 8 | 8 | 1 | 0 | Yes |
| godly-gates | sample | 8 | 8 | 1 | 0 | Yes |
| olympus-wrath | sample | 8 | 8 | 1 | 0 | Yes |
| enchanted-grove | sample | 8 | 8 | 1 | 0 | Yes |
| fire-spike | sample | 8 | 8 | 1 | 0 | No |
| coin-volcano | sample | 8 | 8 | 1 | 0 | No |
| ace-high | sample | 7 | 7 | 0 | 0 | Yes |
| color-game | sample | 8 | 8 | 0 | 0 | Yes |
| tongits-arena | sample | 9 | 9 | 0 | 0 | Yes |
| lucky-drop | sample | 9 | 18 | 0 | 0 | Yes |
| color-game-pro | sample | 8 | 8 | 0 | 0 | Yes |
| lucky-nine-plus | sample | 7 | 7 | 0 | 0 | Yes |
| drop-deluxe | sample | 4 | 4 | 0 | 0 | Yes |
| poker-showdown | sample | 9 | 9 | 0 | 0 | Yes |
| deep-bass | sample | 14 | 14 | 0 | 0 | Yes |
| dragon-fisher | sample | 9 | 9 | 0 | 0 | Yes |
| crab-cannon | sample | 9 | 9 | 0 | 0 | Yes |
| shark-hunter | sample | 9 | 9 | 0 | 0 | Yes |
| octopus-armada | sample | 9 | 9 | 0 | 0 | Yes |
| turtle-tide | sample | 9 | 9 | 0 | 0 | Yes |
| whale-war | sample | 9 | 9 | 0 | 0 | Yes |
| baccarat | sample | 7 | 7 | 0 | 0 | Yes |
| lucky9 | sample | 7 | 7 | 0 | 0 | Yes |
| threecardpoker | sample | 9 | 9 | 0 | 0 | Yes |
| abyssal-pearls | sample | 8 | 8 | 1 | 0 | No |
| sirens-lagoon | sample | 8 | 8 | 1 | 0 | No |
| tidecaller-hoard | sample | 8 | 8 | 1 | 0 | No |
| lighthouse-loot | sample | 8 | 8 | 1 | 0 | No |
| moonjelly-bay | sample | 8 | 8 | 1 | 0 | No |
| starfall-sanctum | sample | 8 | 8 | 1 | 0 | No |
| aurora-spire | sample | 8 | 8 | 1 | 0 | No |
| comet-carnival | sample | 8 | 8 | 1 | 0 | No |
| moonwell-mysteries | sample | 8 | 8 | 1 | 0 | No |
| constellation-keep | sample | 8 | 8 | 1 | 0 | No |
| cinder-crown | sample | 8 | 8 | 1 | 0 | No |
| magma-anvil | sample | 8 | 8 | 1 | 0 | No |
| obsidian-oracle | sample | 8 | 8 | 1 | 0 | No |
| salamander-sun | sample | 8 | 8 | 1 | 0 | No |
| ashfall-citadel | sample | 8 | 8 | 1 | 0 | No |
| glacier-glyphs | sample | 8 | 8 | 1 | 0 | No |
| northwind-narwhal | sample | 8 | 8 | 1 | 0 | No |
| snowglobe-sorcery | sample | 8 | 8 | 1 | 0 | No |
| frostbound-fjord | sample | 8 | 8 | 1 | 0 | No |
| polar-prism | sample | 8 | 8 | 1 | 0 | No |
| orchid-oasis | sample | 8 | 8 | 1 | 0 | No |
| firefly-hollow | sample | 8 | 8 | 1 | 0 | No |
| canopy-kingdom | sample | 8 | 8 | 1 | 0 | No |
| monsoon-grove | sample | 8 | 8 | 1 | 0 | No |
| hummingbird-haven | sample | 8 | 8 | 1 | 0 | No |
| babylon-gardens | sample | 8 | 8 | 1 | 0 | No |
| persian-peacock | sample | 8 | 8 | 1 | 0 | No |
| celtic-clover-court | sample | 8 | 8 | 1 | 0 | No |
| shogun-sakura | sample | 8 | 8 | 1 | 0 | No |
| longship-raiders | sample | 8 | 8 | 1 | 0 | No |
| clockwork-cache | sample | 8 | 8 | 1 | 0 | No |
| brass-zeppelin | sample | 8 | 8 | 1 | 0 | No |
| tesla-tower | sample | 8 | 8 | 1 | 0 | No |
| gearspring-gala | sample | 8 | 8 | 1 | 0 | No |
| steamforge-express | sample | 8 | 8 | 1 | 0 | No |
| alchemist-atelier | sample | 8 | 8 | 1 | 0 | No |
| crystal-grimoire | sample | 8 | 8 | 1 | 0 | No |
| tarot-twilight | sample | 8 | 8 | 1 | 0 | No |
| potion-parlor | sample | 8 | 8 | 1 | 0 | No |
| hexbound-library | sample | 8 | 8 | 1 | 0 | No |
| cosmic-koi | sample | 8 | 8 | 1 | 0 | No |
| saturn-rings | sample | 8 | 8 | 1 | 0 | No |
| rocket-rendezvous | sample | 8 | 8 | 1 | 0 | No |
| asteroid-miners | sample | 8 | 8 | 1 | 0 | No |
| nebula-nomads | sample | 8 | 8 | 1 | 0 | No |
| stag-spirit-glade | sample | 8 | 8 | 1 | 0 | No |
| tortoise-treasury | sample | 8 | 8 | 1 | 0 | No |
| crane-pavilion | sample | 8 | 8 | 1 | 0 | No |
| thunderbird-totem | sample | 8 | 8 | 1 | 0 | No |
| monarch-meadow | sample | 8 | 8 | 1 | 0 | No |

## Duplicate recordings (identical SHA-256)


## Evidence and limits

[Complete event keys, resolved paths, missing files and retained inventory](../output/sfx-audit/audit.json). Re-run with `npx tsx scripts/audit-game-sfx.ts`.

No sound playback, perceptual comparison, mobile audio-unlock or browser runtime test was performed. Hash equality proves byte-identical files; different hashes do not prove perceptually different sound. Shared synthesis code can sound related despite distinct voice settings. No source or audio assets were changed.
