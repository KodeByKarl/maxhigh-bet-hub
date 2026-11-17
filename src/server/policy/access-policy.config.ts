/**
 * Access policy, compiled into the build. FULL CATALOG RELEASE: no games are locked (owner business decision, 2026-11-17); the account cap is OFF.
 *
 * - It cannot be edited on the server or through the database: changing it means shipping a new release.
 * - Locked games: NONE. `lockedGames` is intentionally empty so every catalog game is visible and playable. The enforcement mechanism
 *   stays compiled in (a future release can lock titles again by listing them here).
 * - Account cap: REMOVED (owner decision). The client may create staff and player accounts, within the normal role permissions.
 * - Identities (usernames named here, honoured only while the role is superadmin; nothing is editable at runtime):
 *     clientOwnerAccounts : the CLIENT's primary owner. Full business administration, may view and edit the configuration of all
 *                           100 games (including the 50 payment-locked ones). May NOT play or activate a locked game.
 *     developerAccounts   : separate technical-maintenance identity of the developer (never the client's identity). Keeps an audited
 *                           QA path on locked games with synthetic credits. This never unlocks a game for any client account.
 *     Every other superadmin-tier account is a client administrator: configures the 50 playable games only.
 * - `grantKeys` is empty on purpose: no signing key exists for this handover, so no grant can ever be accepted and unlocking
 *   a game requires a new verified release. Never put a private key, password or token here.
 */
export type AccessPolicy = {
  version: 1;
  environment: string;
  gameLocks: { enforcement: "on" | "off"; lockedGames: readonly string[] };
  clientAccounts: { enforcement: "on" | "off"; maxClientAccounts: number };
  /** The client's primary owner account(s). Full administration and configuration of all 100 games; cannot play or activate locked games. */
  clientOwnerAccounts: readonly string[];
  /** The developer's maintenance account(s). Separate from the client's identity; audited QA play of locked games. */
  developerAccounts: readonly string[];
  grantKeys: readonly { id: string; publicKeyPem: string }[];
};

export const ACCESS_POLICY: AccessPolicy = {
  version: 1,
  environment: "production",
  gameLocks: {
    enforcement: "on",
    lockedGames: [],
  },
  clientAccounts: { enforcement: "off", maxClientAccounts: 2 },
  clientOwnerAccounts: ["client_owner"],
  developerAccounts: ["uat_owner"],
  grantKeys: [],
};
