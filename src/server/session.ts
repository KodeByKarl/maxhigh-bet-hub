import { randomBytes, randomUUID } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { PublicUser } from "@/lib/user";
import { getDb } from "./db/client";
import { sessions, users, type User } from "./db/schema";

export type { PublicUser };

export const SESSION_COOKIE = "mh_session";

/** Hard max session length from login (all roles). Overnight tabs must not stay signed in. */
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Server-side idle window based on lastSeenAt.
 * lastSeenAt is only bumped by intentional activity (heartbeat), not by session polls.
 */
export const SESSION_IDLE_MS = 60 * 60 * 1000; // 60 minutes

/** Cookie maxAge matches absolute session. */
const SESSION_COOKIE_MAX_AGE_S = Math.floor(SESSION_ABSOLUTE_MS / 1000);

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    publicUserId: u.publicUserId,
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
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

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
    maxAge: SESSION_COOKIE_MAX_AGE_S,
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

export async function destroyUserSessions(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.delete(sessions).where(eq(sessions.userId, userId));
  return result[0]?.affectedRows ?? 0;
}

/** Mark the current session as active (Players Online + idle clock). */
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

async function invalidateSession(sessionId: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      user: users,
      sessionId: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }

  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : 0;
  const lastSeenAt = row.lastSeenAt ? new Date(row.lastSeenAt).getTime() : createdAt;
  const nowMs = now.getTime();

  // Absolute max — covers overnight / forgotten tabs for every role
  if (createdAt > 0 && nowMs - createdAt > SESSION_ABSOLUTE_MS) {
    await invalidateSession(row.sessionId);
    return null;
  }

  // Idle max — lastSeenAt only moves on heartbeat / real activity
  if (lastSeenAt > 0 && nowMs - lastSeenAt > SESSION_IDLE_MS) {
    await invalidateSession(row.sessionId);
    return null;
  }

  // If user is locked, invalidate active session immediately
  const isLocked =
    row.user.isLocked === "yes" ||
    (row.user.failedAttempts ?? 0) >= 3 ||
    (row.user.lockedUntil && now < new Date(row.user.lockedUntil));

  if (isLocked) {
    await invalidateSession(row.sessionId);
    return null;
  }

  // Do NOT bump lastSeenAt here — session polls would keep idle forever.
  return toPublicUser(row.user);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized — please sign in");
  return user;
}

import { isStaffRole } from "../lib/user";

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (!isStaffRole(user.role)) {
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
