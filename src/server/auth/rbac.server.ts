import type { PublicUser, UserRole } from "@/lib/user";
import { getSessionUser } from "../session";
import { writeAuditLog } from "../admin/audit.server";

export type PermissionName =
  | "DASHBOARD_VIEW"
  | "USER_LIST"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_ADJUST_BALANCE"
  | "USER_LOCK"
  | "USER_UNLOCK"
  | "USER_FORCE_LOGOUT"
  | "USER_RESET_FAILED"
  | "ROLE_UPDATE"
  | "WALLET_LIST"
  | "WALLET_REVIEW"
  | "SUPPORT_MANAGE"
  | "AUDIT_LOG_VIEW"
  | "TRANSACTION_LIST"
  | "REPORTS_VIEW"
  | "GAME_CONTROL_UPDATE"
  | "JACKPOT_SET"
  | "PLATFORM_SETTINGS_UPDATE"
  | "PROMOTION_MANAGE"
  | "RISK_CONTROL_UPDATE";

/**
 * Explicit Permission Mapping.
 * Fail-Closed: Any permission not explicitly mapping a role rejects that role.
 */
export const PERMISSION_MAP: Record<PermissionName, UserRole[]> = {
  DASHBOARD_VIEW: ["admin", "superadmin", "agent", "master_agent"],
  USER_LIST: ["admin", "superadmin", "agent", "master_agent"],
  USER_CREATE: ["admin", "superadmin", "agent", "master_agent"],
  USER_UPDATE: ["admin", "superadmin"],
  USER_ADJUST_BALANCE: ["admin", "superadmin", "agent", "master_agent"],
  USER_LOCK: ["admin", "superadmin", "agent", "master_agent"],
  USER_UNLOCK: ["admin", "superadmin", "agent", "master_agent"],
  USER_FORCE_LOGOUT: ["admin", "superadmin"],
  USER_RESET_FAILED: ["admin", "superadmin", "agent", "master_agent"],
  WALLET_LIST: ["admin", "superadmin", "agent", "master_agent"],
  WALLET_REVIEW: ["admin", "superadmin"],
  SUPPORT_MANAGE: ["admin", "superadmin", "agent", "master_agent"],
  AUDIT_LOG_VIEW: ["admin", "superadmin", "agent", "master_agent"],
  TRANSACTION_LIST: ["admin", "superadmin", "agent", "master_agent"],
  REPORTS_VIEW: ["admin", "superadmin", "agent", "master_agent"],
  
  // Superadmin-Only Operations
  ROLE_UPDATE: ["superadmin"],
  GAME_CONTROL_UPDATE: ["superadmin"],
  JACKPOT_SET: ["superadmin"],
  PLATFORM_SETTINGS_UPDATE: ["superadmin"],
  PROMOTION_MANAGE: ["superadmin"],
  RISK_CONTROL_UPDATE: ["superadmin"],
};

/**
 * Server-side RBAC Guard.
 * Always resolves role from server-side DB session — client claims are never trusted.
 * Fails closed with 403 Forbidden and writes audit log for denied attempts.
 */
export async function requirePermission(
  permission: PermissionName,
  targetInfo?: { targetType?: string; targetId?: string },
): Promise<PublicUser> {
  const user = await getSessionUser();

  if (!user) {
    await writeAuditLog({
      actor: { id: "anonymous", username: "anonymous" },
      action: "rbac.denied",
      summary: `Access DENIED for ${permission}: Unauthenticated request`,
      targetType: targetInfo?.targetType ?? "permission",
      targetId: targetInfo?.targetId ?? permission,
      meta: { permission, status: "denied", reason: "unauthenticated" },
    });
    throw new Error("Unauthorized — please sign in");
  }

  const allowedRoles = PERMISSION_MAP[permission] ?? [];
  const isAllowed = allowedRoles.includes(user.role);

  if (!isAllowed) {
    await writeAuditLog({
      actor: user,
      action: "rbac.denied",
      summary: `Access DENIED for ${permission}: Role '@${user.role}' lacks required permissions`,
      targetType: targetInfo?.targetType ?? "permission",
      targetId: targetInfo?.targetId ?? permission,
      meta: { permission, role: user.role, allowedRoles, status: "denied" },
    });
    throw new Error(`Forbidden — role '${user.role}' does not have permission '${permission}'`);
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<PublicUser> {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const user = await getSessionUser();

  if (!user || !roles.includes(user.role)) {
    if (user) {
      await writeAuditLog({
        actor: user,
        action: "rbac.denied",
        summary: `Access DENIED for role guard: Role '@${user.role}' not in [${roles.join(", ")}]`,
        targetType: "role_guard",
        targetId: roles.join(","),
        meta: { role: user.role, allowedRoles: roles, status: "denied" },
      });
    }
    throw new Error("Forbidden — insufficient privileges");
  }

  return user;
}
