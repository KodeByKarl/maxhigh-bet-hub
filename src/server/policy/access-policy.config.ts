/**
 * Access policy, compiled into the build. LIMITED CLIENT TESTING RELEASE: the 50-game lock is ON; the account cap is OFF.
 *
 * - It cannot be edited on the server or through the database: changing it means shipping a new release.
 * - Locked games: the 50 titles below (approved allocation, deploy/handoff/PROPOSED_GAME_ALLOCATION.json). Wild Panther stays playable.
 * - Account cap: REMOVED (owner decision). The client may create staff and player accounts, within the normal role permissions.
 * - Owner: the named account(s) in `ownerAccounts` (and only while their role is superadmin) keep full access to all 100 games,
 *   including an audited QA path on locked games with synthetic credits. This never unlocks a game for any client account.
 * - `grantKeys` is empty on purpose: no signing key exists for this handover, so no grant can ever be accepted and unlocking
 *   a game requires a new verified release. Never put a private key, password or token here.
 */
export type AccessPolicy = {
  version: 1;
  environment: string;
  gameLocks: { enforcement: "on" | "off"; lockedGames: readonly string[] };
  clientAccounts: { enforcement: "on" | "off"; maxClientAccounts: number };
  /** Usernames of the OWNER superadmin account(s). Everything else with a superadmin role is a client administrator. */
  ownerAccounts: readonly string[];
  grantKeys: readonly { id: string; publicKeyPem: string }[];
};

export const ACCESS_POLICY: AccessPolicy = {
  version: 1,
  environment: "uat",
  gameLocks: {
    enforcement: "on",
    lockedGames: [
      "alchemist-atelier",
      "ashfall-citadel",
      "asteroid-miners",
      "babylon-gardens",
      "brass-zeppelin",
      "canopy-kingdom",
      "celtic-clover-court",
      "cinder-crown",
      "clockwork-cache",
      "color-game-pro",
      "constellation-keep",
      "cosmic-koi",
      "crane-pavilion",
      "crystal-grimoire",
      "drop-deluxe",
      "firefly-hollow",
      "frostbound-fjord",
      "gearspring-gala",
      "glacier-glyphs",
      "hexbound-library",
      "hummingbird-haven",
      "longship-raiders",
      "lucky-drop",
      "lucky-nine-plus",
      "magma-anvil",
      "monarch-meadow",
      "monsoon-grove",
      "nebula-nomads",
      "northwind-narwhal",
      "obsidian-oracle",
      "octopus-armada",
      "orchid-oasis",
      "persian-peacock",
      "poker-showdown",
      "polar-prism",
      "potion-parlor",
      "rocket-rendezvous",
      "salamander-sun",
      "saturn-rings",
      "shogun-sakura",
      "snowglobe-sorcery",
      "stag-spirit-glade",
      "steamforge-express",
      "tarot-twilight",
      "tesla-tower",
      "thunderbird-totem",
      "tongits-arena",
      "tortoise-treasury",
      "turtle-tide",
      "whale-war",
    ],
  },
  clientAccounts: { enforcement: "off", maxClientAccounts: 2 },
  ownerAccounts: ["uat_owner"],
  grantKeys: [],
};
