/**
 * Server-side access restrictions (Phase 2). SHIPPED INACTIVE: nothing here changes behaviour until the compiled policy
 * (policy/access-policy.config.ts) is switched on in a reviewed release.
 *
 *  - Game locks: `assertGameAccess` is called by withFinancialOperation for every game operation, before any wallet write.
 *  - Client-account cap: `assertClientCapacity` is called inside the account-creation / re-activation transactions; the same
 *    rule is mirrored by DB triggers (migration 0005) as a backstop.
 *  - Unlocking: only by a developer-signed Ed25519 grant, verified against public keys compiled into the build, recorded in an
 *    append-only table and audited. There is no password, master key or flag that unlocks anything.
 *
 * Nothing here deletes data, confiscates winnings or touches wallets. A locked game still lets a player FINISH a round that
 * was already paid for (free spins, an open hand, a climb in progress); it refuses every new wager or feature purchase.
 */
import { randomUUID, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, isNotNull, ne, not, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db/client";
import { accountLimits, entitlementGrants, users } from "./db/schema";
import { writeAuditLog } from "./admin/audit.server";
import { ACCESS_POLICY, type AccessPolicy } from "./policy/access-policy.config";

export const GAME_LOCKED_MESSAGE =
  "Game Locked. Please settle the remaining project payment to activate this game.";
export const ACCOUNT_LIMIT_MESSAGE =
  "Account Limit Reached. Please settle the remaining project payment to add more client accounts.";
// Same text on every surface (create forms, admin notice, API errors).
export const REGISTRATION_LIMIT_MESSAGE = ACCOUNT_LIMIT_MESSAGE;
export const ADMIN_LIMIT_MESSAGE = ACCOUNT_LIMIT_MESSAGE;
/** Stable machine-readable codes, carried on the error object and written to the audit metadata. */
export const GAME_LOCKED_CODE = "GAME_LOCKED";
export const ACCOUNT_LIMIT_CODE = "ACCOUNT_LIMIT_REACHED";

export class GameLockedError extends Error {
  readonly code = GAME_LOCKED_CODE;
  constructor() {
    super(GAME_LOCKED_MESSAGE);
    this.name = "GameLockedError";
  }
}

// ------------------------------------------------------------------------------------------------ policy source
let policy: AccessPolicy = ACCESS_POLICY;
let cache: { at: number; value: EffectiveGrants } | null = null;

function assertDisposableEnvironment(): void {
  const url = process.env.DATABASE_URL ?? "";
  const m = /^mysql:\/\/[^@]*@(127\.0\.0\.1|localhost)(?::\d+)?\/([^?]+)/.exec(url);
  const disposable = !!m && /(^|_)(qa|test|restr|audit|clone)/i.test(m[2]!);
  if (process.env.MAXHIGH_POLICY_TEST_OVERRIDE !== "disposable-test-only" || !disposable)
    throw new Error("Policy override refused: not a disposable test environment");
}

/** Test-only override. Refuses unless explicitly enabled AND the database is a loopback, disposable-looking one. */
export function overridePolicyForDisposableTests(next: AccessPolicy | null): void {
  assertDisposableEnvironment();
  policy = next ?? ACCESS_POLICY;
  cache = null;
}

// Startup-only test hook for end-to-end tests of the BUILT app. Documented, narrow and fail-closed: if the variable is set outside
// a loopback, disposable-named database the process refuses to start instead of ignoring it. Never set on UAT or production.
if (process.env.MAXHIGH_POLICY_TEST_FILE) {
  assertDisposableEnvironment();
  policy = JSON.parse(readFileSync(process.env.MAXHIGH_POLICY_TEST_FILE, "utf8")) as AccessPolicy;
}
export const getAccessPolicy = (): AccessPolicy => policy;

// ------------------------------------------------------------------------------------------------ grants
const gameId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
const baseGrant = {
  v: z.literal(1),
  environment: z.string().min(1).max(32),
  nonce: z.string().min(16).max(64),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
};
const grantSchema = z.discriminatedUnion("kind", [
  z.object({
    ...baseGrant,
    kind: z.literal("unlock-games"),
    games: z.array(gameId).min(1).max(100),
  }),
  z.object({
    ...baseGrant,
    kind: z.literal("lift-client-cap"),
    maxClientAccounts: z.number().int().min(0).max(1000),
  }),
  z.object({
    ...baseGrant,
    kind: z.literal("authorize-exempt-account"),
    username: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9_]+$/),
    accountClass: z.enum(["qa", "admin"]),
  }),
]);
export type Grant = z.infer<typeof grantSchema>;

/** Verify a developer-signed grant (Ed25519 over the exact payload bytes). Throws on any problem. */
export function verifyGrant(
  payload: string,
  signatureBase64: string,
  keyId: string,
  now = new Date(),
): Grant {
  const key = policy.grantKeys.find((k) => k.id === keyId);
  if (!key) throw new Error("Unknown grant key");
  if (payload.length > 8192 || signatureBase64.length > 256) throw new Error("Grant too large");
  let ok = false;
  try {
    ok = verify(
      null,
      Buffer.from(payload, "utf8"),
      createPublicKey(key.publicKeyPem),
      Buffer.from(signatureBase64, "base64"),
    );
  } catch {
    ok = false;
  }
  if (!ok) throw new Error("Invalid grant signature");
  const parsed = grantSchema.safeParse(JSON.parse(payload));
  if (!parsed.success) throw new Error("Malformed grant");
  const g = parsed.data;
  if (g.environment !== policy.environment) throw new Error("Grant is for a different environment");
  if (g.expiresAt && now > new Date(g.expiresAt)) throw new Error("Grant expired");
  return g;
}

type EffectiveGrants = {
  unlocked: Set<string>;
  maxClients: number | null;
  exempt: Map<string, "qa" | "admin">;
};

/** Re-verifies every stored grant on load, so a row inserted straight into the database without a valid signature grants nothing. */
// `executor` MUST be the caller's open transaction when called from inside one: opening a second pooled connection while holding the
// first lets N concurrent callers (N = pool size) wait on each other forever (pool deadlock). Regression-tested.
type Reader = Pick<ReturnType<typeof getDb>, "select">;
async function loadEffectiveGrants(executor?: Reader): Promise<EffectiveGrants> {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const out: EffectiveGrants = { unlocked: new Set(), maxClients: null, exempt: new Map() };
  if (policy.grantKeys.length > 0) {
    const rows = await (executor ?? getDb()).select().from(entitlementGrants);
    for (const r of rows) {
      let g: Grant;
      try {
        g = verifyGrant(r.payload, r.signature, r.keyId, new Date(0));
      } catch {
        continue;
      } // expiry is enforced at apply time
      if (g.kind === "unlock-games") g.games.forEach((x) => out.unlocked.add(x));
      else if (g.kind === "lift-client-cap")
        out.maxClients = Math.max(out.maxClients ?? 0, g.maxClientAccounts);
      else out.exempt.set(g.username, g.accountClass);
    }
  }
  cache = { at: Date.now(), value: out };
  return out;
}
export const invalidateAccessCache = () => {
  cache = null;
};

// ------------------------------------------------------------------------------------------------ game gate
/** Actions that finish a round the player already paid for. Everything else (spin, deal, fire, buy, ensure-session...) is a new wager. */
export const isSettleAction = (action: string) =>
  /(FreeSpinFn|PlayFn|FoldFn|DrawFn|GuessFn|SkipFn|CashoutFn)$/.test(action);

export async function getEffectiveLockedGames(): Promise<Set<string>> {
  if (policy.gameLocks.enforcement !== "on") return new Set();
  const g = await loadEffectiveGrants();
  return new Set(policy.gameLocks.lockedGames.filter((id) => !g.unlocked.has(id)));
}

export async function assertGameAccess(
  gameId: string,
  action: string,
  actor: { id: string; username: string; role?: string | null },
): Promise<void> {
  if (policy.gameLocks.enforcement !== "on") return;
  const locked = await getEffectiveLockedGames();
  if (!locked.has(gameId)) return;
  if (isSettleAction(action)) return; // never strand a paid-for round: let the player finish it
  // Owner QA path: server-side, by account identity (compiled policy), audited, synthetic credits only. It changes nothing for clients.
  if (isOwnerAccount(actor)) {
    await auditOwnerQa(actor, gameId, action);
    return;
  }
  await writeAuditLog({
    actor,
    action: "game.locked_attempt",
    summary: `Blocked ${action} on locked game ${gameId}`,
    targetType: "game",
    targetId: gameId,
    meta: { action, code: GAME_LOCKED_CODE },
  });
  throw new GameLockedError(); // same message for every role, including owner/superadmin
}

/**
 * Admin attempts to switch a restricted game ON. Refused for every role while the lock is in force, audited with a stable code.
 * (The wager gate refuses play regardless of this flag; this makes the admin screen and API say so explicitly.)
 */
export async function assertGameActivatable(
  gameId: string,
  actor: { id: string; username: string; role?: string | null },
): Promise<void> {
  if (isOwnerAccount(actor)) return; // the owner configures all 100 games; the client-facing lock is unaffected
  const locked = await getEffectiveLockedGames();
  if (!locked.has(gameId)) return;
  await writeAuditLog({
    actor,
    action: "game.activation_rejected",
    summary: `Blocked activation of locked game ${gameId}`,
    targetType: "game",
    targetId: gameId,
    meta: { code: GAME_LOCKED_CODE },
  });
  throw new GameLockedError();
}

/** Public, non-sensitive view for the lobby: which games show as locked. No payment or implementation details. */
export async function getPublicAccessStatus(
  viewer?: { username?: string | null; role?: string | null } | null,
): Promise<{
  lockedGames: string[];
  message: string | null;
  ownerQa?: boolean;
}> {
  if (isOwnerAccount(viewer)) return { lockedGames: [], message: null, ownerQa: true }; // display only; clients are unaffected
  const locked = [...(await getEffectiveLockedGames())].sort();
  return { lockedGames: locked, message: locked.length ? GAME_LOCKED_MESSAGE : null };
}

// ------------------------------------------------------------------------------------------------ client-account cap
/** The OWNER superadmin account(s) named in the compiled policy. A client superadmin is NOT an owner. */
export const isOwnerAccount = (
  u: { username?: string | null; role?: string | null } | null | undefined,
) =>
  !!u &&
  u.role === "superadmin" &&
  !!u.username &&
  (policy.ownerAccounts ?? []).includes(u.username.toLowerCase());

/**
 * The named owner account may credit ITSELF with synthetic QA credits, only while the compiled environment is "uat". Every other
 * account (including client superadmins) keeps the rule "no chips on your own account". The adjustment is still ledgered and audited.
 */
export const ownerMayCreditSelf = (
  actor: { id: string; username?: string | null; role?: string | null },
  targetId: string,
) => actor.id === targetId && isOwnerAccount(actor) && policy.environment === "uat";

/** Client administrators must never modify the protected owner account (profile, role, password, balance, lock state, sessions). */
export async function assertNotProtectedOwner(
  actor: { id: string; username: string; role?: string | null },
  target: { id: string; username: string },
): Promise<void> {
  if (!(policy.ownerAccounts ?? []).includes(target.username.toLowerCase())) return;
  if (isOwnerAccount(actor)) return;
  await writeAuditLog({
    actor,
    action: "owner.protected_denied",
    summary: `Blocked attempt to modify the protected owner account by @${actor.username}`,
    targetType: "user",
    targetId: target.id,
    meta: { code: "OWNER_PROTECTED" },
  });
  throw new Error("Forbidden — protected owner account");
}

const ownerQaSeen = new Map<string, number>();
async function auditOwnerQa(
  actor: { id: string; username: string },
  gameId: string,
  action: string,
) {
  const key = `${actor.id}:${gameId}`;
  if (Date.now() - (ownerQaSeen.get(key) ?? 0) < 30 * 60_000) return; // one audit row per owner/game per 30 minutes
  ownerQaSeen.set(key, Date.now());
  await writeAuditLog({
    actor,
    action: "game.owner_qa_access",
    summary: `Owner QA access to locked game ${gameId} (${action})`,
    targetType: "game",
    targetId: gameId,
    meta: { action, code: "OWNER_QA" },
  });
}

/** Only STAFF accounts (any role other than player) count toward the cap; ordinary players never do. Mirrors migration 0006. */
export const countsTowardCap = (role: string, accountClass: string) =>
  accountClass === "client" && role !== "player";

export class ClientLimitError extends Error {
  readonly code = ACCOUNT_LIMIT_CODE;
  constructor(
    readonly attempt: string = "unknown",
    readonly max: number | null = null,
  ) {
    super(ACCOUNT_LIMIT_MESSAGE);
    this.name = "ClientLimitError";
  }
}
export const isClientLimitDbError = (e: unknown) =>
  /CLIENT_ACCOUNT_LIMIT/.test(e instanceof Error ? e.message : String(e)) ||
  /CLIENT_ACCOUNT_LIMIT/.test(
    String((e as { cause?: { message?: string } } | null)?.cause?.message ?? ""),
  );

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function getEffectiveClientCap(
  executor?: Reader,
): Promise<{ enforced: boolean; max: number }> {
  if (policy.clientAccounts.enforcement !== "on")
    return { enforced: false, max: policy.clientAccounts.maxClientAccounts };
  const g = await loadEffectiveGrants(executor);
  return {
    enforced: true,
    max: Math.max(policy.clientAccounts.maxClientAccounts, g.maxClients ?? 0),
  };
}

/** Class a NEW account gets. Always 'client' unless a verified developer grant names this exact username. Never from client input. */
export async function resolveNewAccountClass(
  username: string,
  executor?: Reader,
): Promise<"client" | "admin" | "qa"> {
  const g = await loadEffectiveGrants(executor);
  return g.exempt.get(username.trim().toLowerCase()) ?? "client";
}

const activeClientFilter = () =>
  and(
    eq(users.accountClass, "client"),
    ne(users.role, "player"),
    not(and(eq(users.isLocked, "yes"), isNotNull(users.lockedBy))!),
  );

/** Call inside the creating/re-activating transaction BEFORE the write. Serialises on the account_limits row (as the DB trigger does). */
export async function assertClientCapacity(
  tx: Tx,
  ctx: { actor: { id: string; username: string } | null; attempt: string; excludeUserId?: string },
): Promise<void> {
  const cap = await getEffectiveClientCap(tx); // same connection as the open transaction: never a second pooled connection
  if (!cap.enforced) return;
  // The locking read of this single row serialises concurrent creators and always returns the LATEST committed counter
  // (maintained by the DB triggers), so no snapshot race and no scan-lock on the users table.
  const [row] = await tx
    .select()
    .from(accountLimits)
    .where(eq(accountLimits.id, "default"))
    .for("update");
  if (Number(row?.activeClients ?? 0) >= cap.max) throw new ClientLimitError(ctx.attempt, cap.max);
}

/** Record a rejection. Call AFTER the transaction has ended: the audit insert uses another connection and must not wait on our locks. */
export async function auditClientLimitRejection(
  actor: { id: string; username: string } | null,
  err: ClientLimitError,
  layer: "application" | "database" = "application",
): Promise<void> {
  await writeAuditLog({
    actor,
    action: "account.create_rejected",
    summary: `Staff-account limit reached; rejected: ${err.attempt}`.slice(0, 500),
    targetType: "account_limit",
    targetId: "default",
    meta: { attempt: err.attempt, max: err.max, layer, code: ACCOUNT_LIMIT_CODE },
  });
}

export async function getAdminLimitStatus(): Promise<{
  restricted: boolean;
  message: string | null;
  activeClients: number;
  max: number | null;
}> {
  const cap = await getEffectiveClientCap();
  if (!cap.enforced) return { restricted: false, message: null, activeClients: 0, max: null };
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(activeClientFilter());
  const n = Number(row?.n ?? 0);
  return {
    restricted: n >= cap.max,
    message: n >= cap.max ? ADMIN_LIMIT_MESSAGE : null,
    activeClients: n,
    max: cap.max,
  };
}

// ------------------------------------------------------------------------------------------------ applying a grant
/** Record a verified developer-signed grant. The caller must already have checked superadmin permission and password re-auth. */
export async function applyEntitlementGrant(
  actor: { id: string; username: string },
  input: { payload: string; signature: string; keyId: string },
): Promise<{ kind: string; nonce: string; detail: string }> {
  const grant = verifyGrant(input.payload, input.signature, input.keyId); // throws unless validly signed, in date and for this environment
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(entitlementGrants).values({
        id: randomUUID(),
        nonce: grant.nonce,
        kind: grant.kind,
        payload: input.payload,
        signature: input.signature,
        keyId: input.keyId,
        appliedBy: actor.id,
        appliedByUsername: actor.username,
      });
      if (grant.kind === "lift-client-cap")
        await tx
          .update(accountLimits)
          .set({ maxClientAccounts: grant.maxClientAccounts })
          .where(eq(accountLimits.id, "default"));
    });
  } catch (e) {
    if (
      /Duplicate/i.test(e instanceof Error ? e.message : "") ||
      /Duplicate/i.test(String((e as { cause?: { message?: string } })?.cause?.message ?? ""))
    )
      throw new Error("This grant was already applied");
    throw e;
  }
  invalidateAccessCache();
  const detail =
    grant.kind === "unlock-games"
      ? `unlocked ${grant.games.length} game(s): ${grant.games.join(", ")}`
      : grant.kind === "lift-client-cap"
        ? `client cap set to ${grant.maxClientAccounts}`
        : `authorized ${grant.accountClass} account @${grant.username}`;
  await writeAuditLog({
    actor,
    action: "entitlement.apply",
    summary: `Applied signed grant (${grant.kind}): ${detail}`.slice(0, 500),
    targetType: "entitlement",
    targetId: grant.nonce,
    meta: { kind: grant.kind, keyId: input.keyId },
  });
  return { kind: grant.kind, nonce: grant.nonce, detail };
}
