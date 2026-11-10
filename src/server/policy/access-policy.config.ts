/**
 * Access policy, compiled into the build. SHIPPED INACTIVE.
 *
 * - It cannot be edited on the server or through the database: changing it means shipping a new release.
 * - `enforcement: "on"` is a developer decision made in a reviewed release, only after the owner has confirmed the
 *   locked-game list AND the contractual authorization (see deploy/handoff/ACCOUNT_AND_GAME_RESTRICTIONS_SPEC.md).
 * - `grantKeys` holds developer-held Ed25519 PUBLIC keys. With no keys, no unlock/exempt grant can ever be accepted.
 *   Never put a private key, password or token here.
 */
export type AccessPolicy = {
  version: 1;
  environment: string;
  gameLocks: { enforcement: "on" | "off"; lockedGames: readonly string[] };
  clientAccounts: { enforcement: "on" | "off"; maxClientAccounts: number };
  grantKeys: readonly { id: string; publicKeyPem: string }[];
};

export const ACCESS_POLICY: AccessPolicy = {
  version: 1,
  environment: "uat",
  gameLocks: { enforcement: "off", lockedGames: [] },
  clientAccounts: { enforcement: "off", maxClientAccounts: 2 },
  grantKeys: [],
};
