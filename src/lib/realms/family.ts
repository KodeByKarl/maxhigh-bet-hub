/**
 * Realms family identity — one place to rename or launch the whole family.
 *
 * The code namespace (`realms`) is neutral; players and superadmin see
 * FAMILY_NAME, so a rebrand is a one-line change here.
 */

export const FAMILY_NAME = "[NEW_FAMILY]";

/** Stable namespace for storage keys, audit actions and asset folders. */
export const FAMILY_KEY = "realms";

/**
 * Soft-launch switch. While false the 50 titles are registered, playable by
 * id and configurable in superadmin, but hidden from the player lobby.
 */
export const FAMILY_LOBBY_VISIBLE = true;
