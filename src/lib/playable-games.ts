/**
 * Soft-launch lobby: Golden Panther + the 9 themed clones.
 * Remove ids here (or drop the allowlist) to show more titles.
 */
export const LOBBY_VISIBLE_GAME_IDS = [
  "golden-panther",
  "jade-jaguar",
  "ember-tiger",
  "lotus-lynx",
  "coral-cobra",
  "frost-fox",
  "solar-serpent",
  "honey-hive",
  "midnight-owl",
  "ruby-raven",
] as const;

const LOBBY_VISIBLE_GAME_ID_SET = new Set<string>(LOBBY_VISIBLE_GAME_IDS);

export function isLobbyVisibleGame(gameId: string): boolean {
  return LOBBY_VISIBLE_GAME_ID_SET.has(gameId);
}

/**
 * Catalog titles that only have lobby thumbnails for now — no playable engine
 * mounted in GamePlayModal (falls through to Coming Soon).
 *
 * Soft-launch: keep these disabled / hidden until their engines are wired.
 */
export const THUMBNAIL_ONLY_GAME_IDS = new Set<string>([
  "knockout-king",
  "arena-champ",
  "safari-gold",
  "pharaoh-fire",
  "desert-riches",
  "outlaw-coins",
  "crystal-cave",
  "diamond-dig",
  "candy-blast",
  "sweet-rush",
  "starlight-ways",
  "galaxy-ace",
  "gate-of-ra",
  "mystic-runes",
]);

export function isThumbnailOnlyGame(gameId: string): boolean {
  return THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}

export function isPlayableGame(gameId: string): boolean {
  return !THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}
