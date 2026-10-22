import { FAMILY_LOBBY_VISIBLE, isRealmsGameId } from "@/lib/realms";

/**
 * Previous lobby rotation, retained so Superadmin can still configure its titles.
 */
const PREVIOUS_LOBBY_GAME_IDS = [
  "golden-panther",
  "wild-panther",
  "jade-jaguar",
  "ember-tiger",
  "lotus-lynx",
  "coral-cobra",
  "frost-fox",
  "solar-serpent",
  "honey-hive",
  "midnight-owl",
  "ruby-raven",
  "lucky-neko",
  "fortune-tiger",
  "fortune-ox",
  "fortune-rabbit",
  "fortune-mouse",
  "prosperity-lion",
  "buffalo-reign",
  "safari-gold",
  "cleopatra-gold",
  "maya-gold",
  "temple-rush",
  "pharaoh-fire",
  "desert-riches",
  "gate-of-ra",
  "zeus-strike",
  "thor-thunder",
  "godly-gates",
  "olympus-wrath",
  "enchanted-grove",
  // Cards
  "ace-high",
  "baccarat",
  "lucky9",
  "threecardpoker",
  "color-game",
  "tongits-arena",
  "lucky-drop",
  "color-game-pro",
  "lucky-nine-plus",
  "drop-deluxe",
  "poker-showdown",
  // Fishing
  "deep-bass",
  "dragon-fisher",
  "crab-cannon",
  "shark-hunter",
  "octopus-armada",
  "turtle-tide",
  "whale-war",
] as const;

/** Current test rotation: previously hidden standalone games plus the Realms family. */
export const LOBBY_VISIBLE_GAME_IDS = ["fire-spike", "coin-volcano"] as const;

const LOBBY_VISIBLE_GAME_ID_SET = new Set<string>(LOBBY_VISIBLE_GAME_IDS);
const PREVIOUS_LOBBY_GAME_ID_SET = new Set<string>(PREVIOUS_LOBBY_GAME_IDS);

export function isLobbyVisibleGame(gameId: string): boolean {
  return LOBBY_VISIBLE_GAME_ID_SET.has(gameId) || (FAMILY_LOBBY_VISIBLE && isRealmsGameId(gameId));
}

/**
 * Superadmin grid: every lobby title plus soft-launch families that are still
 * hidden from players, so they can be configured before launch.
 */
export function isAdminListedGame(gameId: string): boolean {
  return (
    isLobbyVisibleGame(gameId) || PREVIOUS_LOBBY_GAME_ID_SET.has(gameId) || isRealmsGameId(gameId)
  );
}

/**
 * Catalog titles that only have lobby thumbnails for now — no playable engine
 * mounted in GamePlayModal (falls through to Coming Soon).
 */
export const THUMBNAIL_ONLY_GAME_IDS = new Set<string>([]);

export function isThumbnailOnlyGame(gameId: string): boolean {
  return THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}

export function isPlayableGame(gameId: string): boolean {
  return !THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}
