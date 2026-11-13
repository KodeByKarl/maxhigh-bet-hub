# Change proposal (NOT applied): let a Super Admin create/assign the `admin` role in the UI

Status: proposal for owner review. No application code, release, role permission or database row has been changed.

## Finding
- The backend already supports `admin`: `superCreateUserFn` and `superSetUserRoleFn` validate roles with `z.enum(["player","admin","agent","master_agent","superadmin"])`
  (`src/functions/superadmin.ts:10`), and `superSetUserRole` (`src/server/superadmin/services.server.ts:278`) accepts any of them behind the `ROLE_UPDATE` permission.
- `src/server/auth/rbac.server.ts` gives `admin` rights agents lack (USER_UPDATE, USER_FORCE_LOGOUT, WALLET_REVIEW); the Owner Manual's permission table matches.
- No screen offers it: the Add-staff modal and both role dropdowns in `src/routes/superadmin/admins.tsx` list only Agent / Master Agent / SuperAdmin (plus Player in the row dropdowns).
  The `/admin/users` modal omits it, and `CreateUserForm.tsx` (which has an Admin option and a default starting balance of 1000) is not used by any page.
- Result: no legitimate way to create an Admin in production, so an Admin QA account cannot be made without direct DB writes (not allowed).

## Proposed change (small, reviewed, tested, released through the normal release process)
1. `admins.tsx`: add `<option value="admin">Admin</option>` to the Add-staff role select and the two per-row role selects. Server enforcement is unchanged.
2. Keep creation Super-Admin-only (existing `ROLE_UPDATE` / create permissions); starting balance stays 0.
3. Unit/integration tests: superadmin can create/assign admin; admin/agent/master_agent cannot; audit log entry written (`super.role_change`); client-cap behaviour unchanged.
4. Do not touch `CreateUserForm.tsx` (unused, default balance 1000) except to delete it in a separate cleanup.
5. Release via the existing backup/rollback kit; no migration needed.

## Alternatives
- (a) The client supplies an existing Admin account for QA (preferred, no change). Check `/superadmin/admins` for any role = Admin first.
- (b) Leave Admin PENDING and document it as "not creatable in the UI".

## Not allowed / not done
Direct SQL insert or role update, silently widening agent permissions, or any release without explicit owner approval.
