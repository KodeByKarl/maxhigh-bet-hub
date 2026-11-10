// Writes the compiled access policy for the limited client testing release from the approved allocation file.
//   node scripts/qa/apply-activation-policy.mjs            (reads deploy/handoff/PROPOSED_GAME_ALLOCATION.json)
// Refuses anything that is not exactly 50 locked + 50 available games, wild-panther locked, or color-game-pro available.
import fs from "node:fs";

const alloc = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => l.split("\t")[0]);
const locked = alloc.locked, available = alloc.available;
const problems = [];
if (locked.length !== 50 || available.length !== 50) problems.push(`expected 50/50, got ${available.length}/${locked.length}`);
if (new Set(locked).size !== locked.length) problems.push("duplicate locked ids");
if (locked.some((g) => available.includes(g))) problems.push("a game is both locked and available");
if (new Set([...locked, ...available]).size !== 100 || [...locked, ...available].some((g) => !catalog.includes(g))) problems.push("allocation does not cover exactly the 100 catalog games");
if (locked.includes("wild-panther")) problems.push("wild-panther must stay playable");
if (!locked.includes("color-game-pro")) problems.push("color-game-pro must be locked");
if (problems.length) throw new Error(problems.join("; "));

const ids = [...locked].sort();
const src = `/**
 * Access policy, compiled into the build. LIMITED CLIENT TESTING RELEASE: the 50-game lock is ON; the account cap is OFF.
 *
 * - It cannot be edited on the server or through the database: changing it means shipping a new release.
 * - Locked games: the 50 titles below (approved allocation, deploy/handoff/PROPOSED_GAME_ALLOCATION.json). Wild Panther stays playable.
 * - Account cap: REMOVED (owner decision). The client may create staff and player accounts, within the normal role permissions.
 * - Owner: the named account(s) in \`ownerAccounts\` (and only while their role is superadmin) keep full access to all 100 games,
 *   including an audited QA path on locked games with synthetic credits. This never unlocks a game for any client account.
 * - \`grantKeys\` is empty on purpose: no signing key exists for this handover, so no grant can ever be accepted and unlocking
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
${ids.map((g) => `      "${g}",`).join("\n")}
    ],
  },
  clientAccounts: { enforcement: "off", maxClientAccounts: 2 },
  ownerAccounts: ["uat_owner"],
  grantKeys: [],
};
`;
fs.writeFileSync("src/server/policy/access-policy.config.ts", src);
console.log(JSON.stringify({ locked: ids.length, available: available.length, wildPantherPlayable: !locked.includes("wild-panther"), colorGameProLocked: locked.includes("color-game-pro") }));
