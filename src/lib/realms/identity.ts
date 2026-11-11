import { REALMS_GAMES } from "./catalog";
export const REALMS_GAME_IDS: readonly string[] = REALMS_GAMES.map((game) => game.id);
const ids = new Set(REALMS_GAME_IDS);
export const isRealmsGameId = (id: string) => ids.has(id);
export { FAMILY_LOBBY_VISIBLE } from "./family";
