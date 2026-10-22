# Shared game artwork findings

Original audit date: 2026-10-12. The findings below record the original state.

Latest update: the Fire Spike/Coin Volcano and Wild Panther/Golden Panther active duplicates have also been replaced. Fishing treasure pickups were differentiated; the old fishing/card PNG duplicates do not describe their current renderers. See [completed follow-up rework](distinct-art-complete.md).

Update: all 16 off-theme games listed below have now been reworked with 160 unique transparent symbols and 16 unique backgrounds. Their active theme paths were validated and the current audit reports zero remaining underwater-pack matches outside Coral Cobra. See [completed rework](slot-art-rework-complete.md) and the regenerated [active-theme audit](slot-artwork-audit.md). The other shared sets below were outside this rework.

## Original off-theme underwater pack (now replaced)

All 16 games below originally loaded the exact same ten symbols and underwater background as Coral Cobra. Equality was verified using SHA-256 hashes of the files reached through each exported game theme, rather than merely scanning retained old files. All now load their own versioned artwork.

| Group | Games |
| --- | --- |
| Safari and animals | Safari Gold, Buffalo Reign, Prosperity Lion |
| Fortune series | Fortune Mouse, Fortune Ox, Fortune Rabbit, Fortune Tiger, Lucky Neko |
| Egyptian and ancient temples | Cleopatra Gold, Desert Riches, Gate of Ra, Maya Gold, Pharaoh Fire |
| Mythical and magical | Enchanted Grove, Godly Gates, Olympus Wrath |

Coral Cobra also uses this set, but its aquatic setting makes it a separate visual-quality review rather than an automatic off-theme finding.

The four recently reworked games—Zeus Strike, Thor Thunder, Temple Rush and Solar Serpent—load their new versioned assets and have zero active matches against this underwater pack. Old unused duplicates still exist in some folders and should not be mistaken for current artwork.

## Other confirmed shared sets

- Fire Spike and Coin Volcano load seven identical reel symbols (`bar`, `dice`, `diamond`, `chip`, `lucky7`, `wild`, `scatter`) and the same card-frame image. These are shared casino symbols, so visual redesign priority is lower than the off-theme underwater group.
- Wild Panther's ten active symbol files are exact copies of the `gp` pack used by Golden Panther. Both also load `/images/symbols/panther/backdrop.webp`. Decide whether the two titles should have distinct visual identities.
- Fishing games share fish and support assets, including Deep Bass, Dragon Fisher, Crab Cannon, Octopus Armada, Shark Hunter, Turtle Tide and Whale War. Shared aquatic objects can be appropriate; this does not by itself prove incorrect theming.
- Ace High and Baccarat share a playing-card deck and table/support images. Standard deck reuse is expected and is not equivalent to an off-theme slot pack.

## Scan scope and limitations

- Recursively hashed 1,598 raster images under `public/images/symbols`, including 600 Realms images. No exact duplicate group involved a Realms raster image.
- No exact duplicate WebP lobby covers were found in the top level of `public/games`.
- Resolved actual active asset paths for all 29 exported Panther themes. All their referenced files exist.
- Manually checked active asset loaders for Fire Spike, Coin Volcano, Wild Panther and representative fishing games.
- File hashes establish exact duplication. They do not detect visually similar files with different encodings, prove that unique art is good, or substitute for a full visual review of every screen.

The detailed active-theme table and URLs are in [slot-artwork-audit.md](slot-artwork-audit.md). Re-run `npx tsx scripts/audit-slot-artwork.ts` to regenerate that table after replacements.
