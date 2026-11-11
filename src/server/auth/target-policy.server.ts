import type { PublicUser, UserRole } from "@/lib/user";

/** Credential/profile administration is separate from player-facing self service. */
export function assertCanEditAccount(
  actor: Pick<PublicUser, "id" | "role">,
  target: { id: string; role: UserRole },
) {
  if (actor.role === "superadmin") return;
  if (actor.role === "admin" && target.role === "player") return;
  throw new Error("Forbidden — account credentials require a higher role");
}
