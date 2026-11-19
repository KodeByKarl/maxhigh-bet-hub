-- MaxHigh game-access audit. READ-ONLY: SELECT statements only, inside a READ ONLY transaction (nothing is created or written).
-- Purpose: confirm the database does not block any of the 100 contracted games independently of the compiled policy.
-- A missing game_controls row is NOT a lock: the server treats it as enabled with the catalog's default bet limits.
-- Usage (on the VPS, with an account that has SELECT on the live schema):
--   mariadb --defaults-extra-file=<client cnf> --table <database> < game-access-readonly-check.sql
SET SESSION TRANSACTION READ ONLY;
START TRANSACTION;
-- The 100 contracted catalog IDs (src/lib/games.ts; deploy/diagnostics/uat-game-catalog.tsv).
SET @mh_catalog = '["golden-panther","godly-gates","olympus-wrath","enchanted-grove","buffalo-reign","fire-spike","fortune-ox","fortune-tiger","fortune-rabbit","cleopatra-gold","lucky-neko","fortune-mouse","prosperity-lion","coin-volcano","zeus-strike","thor-thunder","maya-gold","temple-rush","safari-gold","pharaoh-fire","desert-riches","gate-of-ra","wild-panther","jade-jaguar","ember-tiger","lotus-lynx","coral-cobra","frost-fox","solar-serpent","honey-hive","midnight-owl","ruby-raven","deep-bass","dragon-fisher","crab-cannon","shark-hunter","octopus-armada","turtle-tide","whale-war","ace-high","baccarat","lucky9","threecardpoker","color-game","tongits-arena","lucky-drop","color-game-pro","lucky-nine-plus","drop-deluxe","poker-showdown","abyssal-pearls","sirens-lagoon","tidecaller-hoard","lighthouse-loot","moonjelly-bay","starfall-sanctum","aurora-spire","comet-carnival","moonwell-mysteries","constellation-keep","cinder-crown","magma-anvil","obsidian-oracle","salamander-sun","ashfall-citadel","glacier-glyphs","northwind-narwhal","snowglobe-sorcery","frostbound-fjord","polar-prism","orchid-oasis","firefly-hollow","canopy-kingdom","monsoon-grove","hummingbird-haven","babylon-gardens","persian-peacock","celtic-clover-court","shogun-sakura","longship-raiders","clockwork-cache","brass-zeppelin","tesla-tower","gearspring-gala","steamforge-express","alchemist-atelier","crystal-grimoire","tarot-twilight","potion-parlor","hexbound-library","cosmic-koi","saturn-rings","rocket-rendezvous","asteroid-miners","nebula-nomads","stag-spirit-glade","tortoise-treasury","crane-pavilion","thunderbird-totem","monarch-meadow"]';

SELECT 'catalog_ids' AS check_name, COUNT(*) AS value FROM (SELECT jt.game_id FROM JSON_TABLE(@mh_catalog, '$[*]' COLUMNS (game_id VARCHAR(64) PATH '$')) AS jt) c;
SELECT 'game_controls_rows' AS check_name, COUNT(*) AS value FROM game_controls;
SELECT 'catalog_games_with_control_row' AS check_name, COUNT(*) AS value
  FROM game_controls g WHERE g.game_id IN (SELECT jt.game_id FROM JSON_TABLE(@mh_catalog, '$[*]' COLUMNS (game_id VARCHAR(64) PATH '$')) AS jt);
-- 1) Explicitly disabled contracted games (refused by the server even with no compiled lock).
SELECT 'DISABLED' AS finding, g.game_id, g.enabled, g.min_bet, g.max_bet, g.updated_at
  FROM game_controls g WHERE g.enabled = 'no' AND g.game_id IN (SELECT jt.game_id FROM JSON_TABLE(@mh_catalog, '$[*]' COLUMNS (game_id VARCHAR(64) PATH '$')) AS jt);
-- 2) Control rows whose ID is not a catalog ID (legacy aliases / typos: they control nothing).
SELECT 'NOT_IN_CATALOG' AS finding, g.game_id, g.enabled
  FROM game_controls g WHERE g.game_id NOT IN (SELECT jt.game_id FROM JSON_TABLE(@mh_catalog, '$[*]' COLUMNS (game_id VARCHAR(64) PATH '$')) AS jt);
-- 3) Bet limits that reject every wager (min greater than max).
SELECT 'BAD_LIMITS' AS finding, g.game_id, g.min_bet, g.max_bet FROM game_controls g
  WHERE g.min_bet IS NOT NULL AND g.max_bet IS NOT NULL
    AND CAST(REGEXP_REPLACE(g.min_bet, '[^0-9.]', '') AS DECIMAL(12,2))
      > CAST(REGEXP_REPLACE(g.max_bet, '[^0-9.]', '') AS DECIMAL(12,2));
-- 4) Platform maintenance mode refuses every wager.
SELECT 'maintenance_mode' AS check_name, maintenance_mode AS value FROM platform_settings;
-- 5) Entitlement grants (ignored while the compiled policy has no grant keys; listed for completeness).
SELECT 'entitlement_grants_rows' AS check_name, COUNT(*) AS value FROM entitlement_grants;

ROLLBACK;
