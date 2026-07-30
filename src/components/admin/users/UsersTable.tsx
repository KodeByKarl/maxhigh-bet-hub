import { useState } from "react";
import { toast } from "sonner";
import {
  adminAdjustBalanceFn,
  adminLockUserFn,
  adminUnlockUserFn,
  adminForceLogoutUserFn,
  adminResetFailedAttemptsFn,
} from "@/functions/admin";
import { formatMoney } from "@/lib/currency";
import type { AdminUserRow } from "@/lib/admin-types";
import { X } from "lucide-react";

export function UsersTable({
  users,
  onChanged,
}: {
  users: AdminUserRow[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lockModalUser, setLockModalUser] = useState<AdminUserRow | null>(null);
  const [lockReason, setLockReason] = useState("");

  async function adjust(userId: string, delta: number) {
    setBusyId(userId);
    try {
      await adminAdjustBalanceFn({
        data: { userId, delta, note: delta > 0 ? "Admin credit" : "Admin debit" },
      });
      toast.success(delta > 0 ? "Balance credited" : "Balance deducted");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Adjust failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lockModalUser) return;
    setBusyId(lockModalUser.id);
    try {
      await adminLockUserFn({
        data: { userId: lockModalUser.id, reason: lockReason.trim() || undefined },
      });
      toast.success(`Account @${lockModalUser.username} locked and active sessions terminated`);
      setLockModalUser(null);
      setLockReason("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lock failed");
    } finally {
      setBusyId(null);
    }
  }

  async function unlock(user: AdminUserRow) {
    setBusyId(user.id);
    try {
      await adminUnlockUserFn({
        data: { userId: user.id },
      });
      toast.success(`Account @${user.username} unlocked & failed login attempts reset`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusyId(null);
    }
  }

  async function forceLogout(user: AdminUserRow) {
    setBusyId(user.id);
    try {
      const res = await adminForceLogoutUserFn({
        data: { userId: user.id },
      });
      toast.success(`Force logout successful for @${res.username} (${res.terminatedSessionsCount} session(s) terminated)`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Force logout failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resetFailedAttempts(user: AdminUserRow) {
    setBusyId(user.id);
    try {
      await adminResetFailedAttemptsFn({
        data: { userId: user.id },
      });
      toast.success(`Failed login attempts counter reset to 0 for @${user.username}`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
        No users found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Balance</th>
              <th className="px-4 py-3 font-semibold">Account Status</th>
              <th className="px-4 py-3 font-semibold">Security Actions</th>
              <th className="px-4 py-3 font-semibold">Quick Adjust</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = Boolean(u.isLocked || (u.failedAttempts ?? 0) >= 3);
              return (
                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-panel-hover/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">@{u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-panel-hover px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {u.role === "admin" ? "master agent" : u.role === "agent" ? "agent" : u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {formatMoney(u.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {locked ? (
                        <span className="rounded-full bg-danger/15 px-2.5 py-0.5 text-[11px] font-bold text-danger">
                          🔒 LOCKED ({u.failedAttempts ?? 3}/3)
                        </span>
                      ) : (
                        <span className="rounded-full bg-lime/15 px-2.5 py-0.5 text-[11px] font-bold text-lime">
                          🟢 ACTIVE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {locked ? (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void unlock(u)}
                          className="rounded-lg border border-lime/40 bg-lime/10 px-2.5 py-1 text-[11px] font-bold text-lime hover:bg-lime/20 disabled:opacity-50"
                        >
                          🔓 Unlock
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => {
                            setLockModalUser(u);
                            setLockReason("");
                          }}
                          className="rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger hover:bg-danger/20 disabled:opacity-50"
                        >
                          🔒 Lock
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void forceLogout(u)}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                        title="Invalidate all active sessions for this user"
                      >
                        🚫 Force Logout
                      </button>

                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void resetFailedAttempts(u)}
                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-panel-hover disabled:opacity-50"
                        title="Reset failed login attempt counter back to 0"
                      >
                        🔄 Reset Failed ({u.failedAttempts ?? 0})
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {[100, 500, 1000].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void adjust(u.id, n)}
                          className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-lime hover:bg-panel-hover disabled:opacity-50"
                        >
                          +₱{n}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void adjust(u.id, -100)}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-danger hover:bg-panel-hover disabled:opacity-50"
                      >
                        −₱100
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lockModalUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setLockModalUser(null)}>
          <form
            onSubmit={handleLockSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-danger/30 bg-panel p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-danger">Lock Account @{lockModalUser.username}</h3>
                <p className="text-xs text-muted-foreground">User will be blocked from logging in and forced logged out immediately.</p>
              </div>
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-panel-hover"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Reason for Locking (Optional)
              </label>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="e.g. Suspicious activity / Manual admin security hold"
                rows={3}
                className="w-full rounded-xl border border-border bg-panel-hover p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-danger"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                className="h-10 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-panel-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === lockModalUser.id}
                className="h-10 rounded-xl bg-danger px-5 text-xs font-bold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                Confirm Lock & Force Logout
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
