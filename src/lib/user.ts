export type UserRole = "player" | "agent" | "master_agent" | "superadmin";

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
  return role === "agent" || role === "master_agent" || role === "superadmin" || (role as string) === "admin";
}

export function isSuperadminRole(role: UserRole | undefined | null): boolean {
  return role === "superadmin";
}
