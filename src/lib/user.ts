/** Shared user shape — safe for client + server. */
export type UserRole = "player" | "admin" | "superadmin";

export type PublicUser = {
  id: string;
  email: string | null;
  username: string;
  balance: number;
  role: UserRole;
  displayName: string | null;
  avatarUrl: string | null;
};

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperadminRole(role: UserRole | undefined | null): boolean {
  return role === "superadmin";
}
