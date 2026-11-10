import { getSessionUser, requireAdmin, requireSuperadmin } from "./session";
import { verifySuperadminChipPassword } from "./superadmin/services.server";
import {
  applyEntitlementGrant,
  getAdminLimitStatus,
  getPublicAccessStatus,
} from "./access-policy.server";

export const APPLY_CONFIRMATION = "APPLY SIGNED GRANT";

/** Public lobby view. Reveals only which games are locked and the approved client-facing message. */
export const publicAccessStatus = async () =>
  getPublicAccessStatus(await getSessionUser().catch(() => null));

/** Admin screens only: whether new client accounts can currently be added. */
export async function adminLimitStatus() {
  await requireAdmin();
  return getAdminLimitStatus();
}

/**
 * Apply a developer-signed entitlement grant. Needs: superadmin session + password re-confirmation + the explicit phrase +
 * a valid Ed25519 signature from a key compiled into this build. No master password and no unsigned path exists.
 */
export async function applyGrantAction(data: {
  payload: string;
  signature: string;
  keyId: string;
  confirm: string;
  confirmPassword?: string;
}) {
  const actor = await requireSuperadmin();
  if (data.confirm !== APPLY_CONFIRMATION)
    throw new Error(`Type "${APPLY_CONFIRMATION}" to confirm`);
  await verifySuperadminChipPassword(actor.id, data.confirmPassword);
  return applyEntitlementGrant(actor, {
    payload: data.payload,
    signature: data.signature,
    keyId: data.keyId,
  });
}
