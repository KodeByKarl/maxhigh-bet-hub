# Incident 2026-11-19 — 50 contracted games still locked on https://maxhigh.online

Status: **root cause confirmed; corrective release prepared locally; NOT deployed.**

## Summary

Production is still running release `29656ce` (2026-11-12). That release compiles an access policy that locks 50 of the 100
contracted games (`gameLocks.enforcement: "on"`, 50 IDs). The owner-approved full-catalog policy (`lockedGames: []`) exists only
in `a2f50aa` (2026-11-17), which was built and pushed (`origin/ci/staging-artifact-rc-20261117`) but never activated in production.

The problem survived because every check that "proved" all games were playable either:

1. ran as `uat_owner`, the compiled **developer account**, which the policy deliberately exempts (lobby shows nothing locked and
   the server lets it wager on locked games), or
2. used `deploy/production/verify-games.mjs`, which only tested the 50 "available" games and asserted exactly 50, or
3. checked the database (`game_controls`), which is not where the lock lives.

## Evidence (read-only)

| Check | Result |
|---|---|
| Live HTML entry assets vs. `29656ce` artifact (SHA-256 of all 33 JS/CSS entry files, `live-client.mjs verifyRelease`) | 33/33 identical — **VERIFIED live = 29656ce** |
| Could live be `a2f50aa`? | No: `a2f50aa` changes `src/styles.css`; live serves `29656ce`'s `styles-DGyOQOiW.css` |
| `29656ce` compiled policy | `environment: "production"`, enforcement `on`, 50 locked IDs |
| `a2f50aa` compiled policy | enforcement `on`, `lockedGames: []` |
| Service worker / CDN cache | none (`/sw.js` 404; HTML `Cache-Control: private, no-store`); not a stale-cache problem |
| `/api/health` (release SHA) | blocked publicly by Caddy (404) — needs the VPS to read |

## Lock sources in the code (complete list)

| Source | File | Effect | Role in this incident |
|---|---|---|---|
| Compiled policy `gameLocks.lockedGames` | `src/server/policy/access-policy.config.ts` | Server refuses new wagers (`assertGameAccess`, called by `withFinancialOperation` before any wallet write); lobby greys/hides the card (`useAccessStatus` → `SlotGameGrid`, `GameModal`); admin cannot activate | **Root cause — 50 games** |
| Developer exemption | `src/server/access-policy.server.ts` (`isDeveloperAccount`) | `uat_owner` sees and plays everything | Masked the locks during QA |
| `game_controls.enabled = 'no'` | `src/server/wallet.server.ts` `assertGameWager`, per-game `*.server.ts` | Refuses wagers for that game | Not the cause in code; a **missing row = enabled** with catalog defaults. Live DB still to be checked (SQL below) |
| `platform_settings.maintenance_mode = 'yes'` | `src/server/wallet.server.ts` | Refuses all wagers | Platform-wide, not per game |
| Entitlement grants | `entitlement_grants` | Can only *unlock*; ignored because no grant keys are compiled | None |
| Role | — | No gameplay code filters by role | None |

`game_controls` having ~50 rows against 100 games is therefore **not a defect**: rows exist only for games whose settings were saved
in the admin screen. No migration is required, and none should be written to "fill in" rows.

## Locked on production today (50)

- Realms slots (41): alchemist-atelier, ashfall-citadel, asteroid-miners, babylon-gardens, brass-zeppelin, canopy-kingdom,
  celtic-clover-court, cinder-crown, clockwork-cache, constellation-keep, cosmic-koi, crane-pavilion, crystal-grimoire,
  firefly-hollow, frostbound-fjord, gearspring-gala, glacier-glyphs, hexbound-library, hummingbird-haven, longship-raiders,
  magma-anvil, monarch-meadow, monsoon-grove, nebula-nomads, northwind-narwhal, obsidian-oracle, orchid-oasis, persian-peacock,
  polar-prism, potion-parlor, rocket-rendezvous, salamander-sun, saturn-rings, shogun-sakura, snowglobe-sorcery,
  stag-spirit-glade, steamforge-express, tarot-twilight, tesla-tower, thunderbird-totem, tortoise-treasury
- Cards (6): color-game-pro, drop-deluxe (Deluxe Draw), lucky-drop (Royal Climb), lucky-nine-plus, poker-showdown, tongits-arena
- Fishing (3): octopus-armada, turtle-tide, whale-war

## Regression hazard found in the developer checkout

Branch `fix/client-gino-adjustments` (`7480aff`) is an **ancestor** of `a2f50aa`: it still carries the 50-game lock. Its
uncommitted working copy changes the list to lock the *other* 50 games (including Wild Panther and Golden Panther:
abyssal-pearls … zeus-strike). Building or deploying from that checkout re-locks games. Do not commit that hunk; fast-forward the
branch to the corrective release instead.

## Corrective release (this branch: `fix/full-catalog-access-20261119`, based on `a2f50aa`)

- Policy: unchanged from `a2f50aa` (`lockedGames: []`, enforcement mechanism kept, `environment: "production"`).
- `scripts/test-catalog-access.ts` (new, wired into `npm run test:unit`, therefore into the CI artifact gate): 100 unique launchable
  manifest IDs; every lock ID exists in the manifest; production policy locks nothing; anonymous / player / agent / master agent /
  client admin / client owner all see zero locked games; the server wager gate admits all 100 games for every client identity;
  the client admin can activate every game. Verified to FAIL against the `29656ce` policy.
- `deploy/production/game-access-readonly-check.sql` (new): read-only DB audit (disabled contracted games, legacy IDs, impossible
  bet limits, maintenance mode). Tested on a disposable MariaDB 13 with all migrations and seeded faults; detects all three and
  writes nothing.
- Operator tooling (untracked files in the main checkout, updated in place): `deploy/production/verify-games.mjs` now verifies all
  100 games, first asserts that a *non-developer* QA player sees zero locked games, and has recipes/settlement for the six card
  games previously excluded; `live-client.mjs` takes `PRODUCTION_RELEASE_SHA` instead of a hard pin.

No changes to balances, payouts, RTP, wallet code, schema, or migrations.

## 100-game matrix

"static PASS" = present in manifest, unique ID, launch component resolves, server handler present, cover asset present, not locked
by the candidate policy for any client role. **Live launch has not been tested for any game** — that needs the deployed candidate
and an authorised QA round (`verify-games.mjs --run`).

| # | Game ID | Title | Category | Launch component | Server handler | Cover asset | LIVE (29656ce) | branch HEAD 7480aff | uncommitted edit | candidate (a2f50aa + this fix) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `golden-panther` | Golden Panther | slot | registered | goldenPantherSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 2 | `godly-gates` | Godly Gates | slot | registered | godlyGatesSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 3 | `olympus-wrath` | Olympus Wrath | slot | registered | olympusWrathSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 4 | `enchanted-grove` | Enchanted Grove | slot | registered | enchantedGroveSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 5 | `buffalo-reign` | Buffalo Reign | slot | registered | buffaloReignSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 6 | `fire-spike` | Fire Spike | slot | registered | fireSpikeSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 7 | `fortune-ox` | Fortune Ox | slot | registered | fortuneOxSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 8 | `fortune-tiger` | Fortune Tiger | slot | registered | fortuneTigerSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 9 | `fortune-rabbit` | Fortune Rabbit | slot | registered | fortuneRabbitSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 10 | `cleopatra-gold` | Cleopatra Gold | slot | registered | cleopatraGoldSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 11 | `lucky-neko` | Lucky Neko | slot | registered | luckyNekoSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 12 | `fortune-mouse` | Fortune Mouse | slot | registered | fortuneMouseSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 13 | `prosperity-lion` | Prosperity Lion | slot | registered | prosperityLionSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 14 | `coin-volcano` | Coin Volcano | slot | registered | coinVolcanoSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 15 | `zeus-strike` | Zeus Strike | slot | registered | zeusStrikeSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 16 | `thor-thunder` | Thor Thunder | slot | registered | thorThunderSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 17 | `maya-gold` | Maya Gold | slot | registered | mayaGoldSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 18 | `temple-rush` | Temple Rush | slot | registered | templeRushSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 19 | `safari-gold` | Safari Gold | slot | registered | safariGoldSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 20 | `pharaoh-fire` | Pharaoh Fire | slot | registered | pharaohFireSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 21 | `desert-riches` | Desert Riches | slot | registered | desertRichesSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 22 | `gate-of-ra` | Gate of Ra | slot | registered | gateOfRaSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 23 | `wild-panther` | Wild Panther | slot | registered | wildPantherSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 24 | `jade-jaguar` | Jade Jaguar | slot | registered | jadeJaguarSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 25 | `ember-tiger` | Ember Tiger | slot | registered | emberTigerSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 26 | `lotus-lynx` | Lotus Lynx | slot | registered | lotusLynxSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 27 | `coral-cobra` | Coral Cobra | slot | registered | coralCobraSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 28 | `frost-fox` | Frost Fox | slot | registered | frostFoxSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 29 | `solar-serpent` | Solar Serpent | slot | registered | solarSerpentSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 30 | `honey-hive` | Honey Hive | slot | registered | honeyHiveSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 31 | `midnight-owl` | Midnight Owl | slot | registered | midnightOwlSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 32 | `ruby-raven` | Ruby Raven | slot | registered | rubyRavenSpinFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 33 | `deep-bass` | Deep Bass | fishing | registered | deepBassFireShotFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 34 | `dragon-fisher` | Dragon Fisher | fishing | registered | dragonFisherFireShotFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 35 | `crab-cannon` | Crab Cannon | fishing | registered | crabCannonFireShotFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 36 | `shark-hunter` | Shark Hunter | fishing | registered | sharkHunterFireShotFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 37 | `octopus-armada` | Octopus Armada | fishing | registered | octopusArmadaFireShotFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 38 | `turtle-tide` | Turtle Tide | fishing | registered | turtleTideFireShotFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 39 | `whale-war` | Whale War | fishing | registered | whaleWarFireShotFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 40 | `ace-high` | Ace High | cards | registered | aceHighDealFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 41 | `baccarat` | Baccarat | cards | registered | baccaratDealFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 42 | `lucky9` | Lucky 9 | cards | registered | lucky9DealFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 43 | `threecardpoker` | Three Card Poker | cards | registered | threeCardPokerDealFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 44 | `color-game` | Color Game | cards | registered | colorGameDealFn | ok | playable | - | locked | static PASS · live NOT TESTED |
| 45 | `tongits-arena` | Tongits Arena | cards | registered | tongitsArenaDealFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 46 | `lucky-drop` | Royal Climb | cards | registered | luckyDropStartFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 47 | `color-game-pro` | Color Game Pro | cards | registered | colorGameProDealFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 48 | `lucky-nine-plus` | Lucky Nine Plus | cards | registered | luckyNinePlusDealFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 49 | `drop-deluxe` | Deluxe Draw | cards | registered | dropDeluxeDealFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 50 | `poker-showdown` | Poker Showdown | cards | registered | pokerShowdownDealFn | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 51 | `abyssal-pearls` | Abyssal Pearls | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 52 | `sirens-lagoon` | Siren's Lagoon | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 53 | `tidecaller-hoard` | Tidecaller Hoard | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 54 | `lighthouse-loot` | Lighthouse Loot | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 55 | `moonjelly-bay` | Moonjelly Bay | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 56 | `starfall-sanctum` | Starfall Sanctum | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 57 | `aurora-spire` | Aurora Spire | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 58 | `comet-carnival` | Comet Carnival | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 59 | `moonwell-mysteries` | Moonwell Mysteries | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | playable | - | locked | static PASS · live NOT TESTED |
| 60 | `constellation-keep` | Constellation Keep | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 61 | `cinder-crown` | Cinder Crown | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 62 | `magma-anvil` | Magma Anvil | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 63 | `obsidian-oracle` | Obsidian Oracle | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 64 | `salamander-sun` | Salamander Sun | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 65 | `ashfall-citadel` | Ashfall Citadel | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 66 | `glacier-glyphs` | Glacier Glyphs | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 67 | `northwind-narwhal` | Northwind Narwhal | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 68 | `snowglobe-sorcery` | Snowglobe Sorcery | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 69 | `frostbound-fjord` | Frostbound Fjord | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 70 | `polar-prism` | Polar Prism | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 71 | `orchid-oasis` | Orchid Oasis | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 72 | `firefly-hollow` | Firefly Hollow | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 73 | `canopy-kingdom` | Canopy Kingdom | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 74 | `monsoon-grove` | Monsoon Grove | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 75 | `hummingbird-haven` | Hummingbird Haven | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 76 | `babylon-gardens` | Babylon Gardens | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 77 | `persian-peacock` | Persian Peacock | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 78 | `celtic-clover-court` | Celtic Clover Court | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 79 | `shogun-sakura` | Shogun Sakura | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 80 | `longship-raiders` | Longship Raiders | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 81 | `clockwork-cache` | Clockwork Cache | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 82 | `brass-zeppelin` | Brass Zeppelin | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 83 | `tesla-tower` | Tesla Tower | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 84 | `gearspring-gala` | Gearspring Gala | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 85 | `steamforge-express` | Steamforge Express | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 86 | `alchemist-atelier` | Alchemist Atelier | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 87 | `crystal-grimoire` | Crystal Grimoire | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 88 | `tarot-twilight` | Tarot Twilight | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 89 | `potion-parlor` | Potion Parlor | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 90 | `hexbound-library` | Hexbound Library | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 91 | `cosmic-koi` | Cosmic Koi | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 92 | `saturn-rings` | Saturn Rings | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 93 | `rocket-rendezvous` | Rocket Rendezvous | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 94 | `asteroid-miners` | Asteroid Miners | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 95 | `nebula-nomads` | Nebula Nomads | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 96 | `stag-spirit-glade` | Stag Spirit Glade | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 97 | `tortoise-treasury` | Tortoise Treasury | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 98 | `crane-pavilion` | Crane Pavilion | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 99 | `thunderbird-totem` | Thunderbird Totem | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |
| 100 | `monarch-meadow` | Monarch Meadow | slot (Realms) | RealmsSlot (family) | realmsSpinFn (gameId) | ok | LOCKED (compiled policy) | locked | - | static PASS · live NOT TESTED |

## Update — corrective release prepared (2026-11-19, later)

### Why the "a2f50aa was activated on Nov 17" record conflicts with what is served

Confirmed facts:
- GitHub Actions run 43999804055 for `a2f50aa` (branch `ci/staging-artifact-rc-20261117`): validation **passed**, the
  "Immutable Linux artifact" upload step **failed**, and the run has **0 artifacts**. No CI-validated `a2f50aa` artifact exists.
- The installed production kit (`maxhigh-production-29656ce/operate.py`) is pinned to `29656ce`; its `plan` requires
  port 18080 to report `8066092` and its `stage` refuses when `/var/www/maxhigh/production` exists. It cannot deploy `a2f50aa`.
- `/api/health` reports `RELEASE_SHA` copied from `target.json`, so a health check can name a release that is not what
  the public site serves. Public entry assets are byte-identical to `29656ce` (33/33).

Hypotheses (need `inspect-readonly.py` output from the VPS to confirm or reject): `a2f50aa` was deployed to UAT
(`maxhigh-uat2`, 18082) rather than production; or it was started from an unvalidated local build on another port / the
18780 probe; or it was activated and later rolled back. Until the inspection JSON is reviewed, treat production as `29656ce`.

### Candidate artifact

- Commit `d22dfd99ef47afdf26d60eaf69ab1244adab910f` (branch `fix/full-catalog-access-20261119`).
- GitHub CI cannot build it: `validate.yml` runs only when the repository is private (`if: github.event.repository.private == true`)
  and the repository is currently **public** (run 44507624558 = skipped).
- Reproducible Linux build instead (`release-kit/linux-build.sh`): fresh clone of the pushed commit, `ubuntu:24.04`, Node
  24.22.2 (tarball checked against nodejs.org SHASUMS256), CI's digest-pinned MariaDB, Playwright 1.65.0. All CI gates
  passed: typecheck, lint, test:unit (incl. catalog-access), build, deployment security, migrations, integration, browser.
- `release.tgz` SHA-256 `c1688bb59ae047e451764026790218068113f556dc6f337af80c6ddd5fc2ce36`;
  `release-validation.json` SHA-256 `ede157e35651497eac0bcc972b2d362b75a202658c67653b81d1d8ec707570c9`;
  publicAssets 3989; games 100.

### Isolated acceptance (`release-kit/isolated-acceptance.mjs`)

Exact artifact, fresh migrated MariaDB, synthetic demo accounts, loopback only — no production/UAT/shared data involved.

| Check | Result |
|---|---|
| Lobby access status: anonymous, player, agent, master agent, client admin | 0 locked games for every identity; none on the developer QA path |
| One minimum-stake round per game as non-developer player `slotmaster`, ledger-reconciled | 100/100 (Royal Climb passed on a re-run after fixing the test's settlement step) |
| Real-browser launch from the lobby category page, desktop 1366×900 | 100/100 mounted, no locked card/text, no page errors |
| Real-browser launch, phone 400×860 (sample: every 10th slot + all cards + all fishing) | 27/27, no horizontal overflow |

Previously locked titles included in the above: 41 Realms slots, 6 card games (Color Game Pro, Deluxe Draw, Royal Climb,
Lucky Nine Plus, Poker Showdown, Tongits Arena), 3 fishing games (Octopus Armada, Turtle Tide, Whale War).
**This is not production evidence.** Production remains `29656ce` with 50 locked games until activation and live verification.
