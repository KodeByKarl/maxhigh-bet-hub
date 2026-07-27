import { randomBytes, randomUUID } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { PublicUser } from "@/lib/user";
import { getDb } from "./db/client";
import { sessions, users, type User } from "./db/schema";

export type { PublicUser };

export const SESSION_COOKIE = "mh_session";
const SESSION_DAYS = 14;

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    balance: Number(u.balance),
    role: u.role as PublicUser["role"],
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  };
}

export function newId() {
  return randomUUID();
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function money(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function createSession(userId: string) {
  const db = getDb();
  const token = newToken();
  const now = new Date();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // 1. Fetch user to check role & username
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const targetUser = userRows[0];

  // 2. Single-device restriction: Invalidate all previous active sessions
  const oldSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));
  if (oldSessions.length > 0) {
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // Audit log single-device auto logout
    if (targetUser) {
      const { writeAuditLog } = await import("./admin/audit.server");
      await writeAuditLog({
        actor: { id: targetUser.id, username: targetUser.username },
        action: "security.single_device_logout",
        summary: `@${targetUser.username} previous device session terminated due to new login from another device.`,
        targetType: "user",
        targetId: targetUser.id,
        meta: {
          terminatedSessionsCount: oldSessions.length,
          timestamp: now.toISOString(),
        },
      });
    }
  }

  // 3. Create fresh new single active session
  await db.insert(sessions).values({
    id: newId(),
    userId,
    token,
    expiresAt,
    lastSeenAt: now,
  });
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession() {
  const db = getDb();
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

/** Mark the current session as active (Players Online). */
export async function touchPresence(): Promise<boolean> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return false;
  const db = getDb();
  const now = new Date();
  const result = await db
    .update(sessions)
    .set({ lastSeenAt: now })
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)));
  return (result[0]?.affectedRows ?? 0) > 0;
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }

  // Lightweight presence bump on any authenticated session read
  await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));

  return toPublicUser(row.user);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized — please sign in");
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "superadmin") {
    throw new Error("Admin access only");
  }
  return user;
}

export async function requireSuperadmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "superadmin") {
    throw new Error("Superadmin access only");
  }
  return user;
}
