import { useState } from "react";
import { toast } from "sonner";
import { adminAdjustBalanceFn, adminToggleUserLockFn } from "@/functions/admin";
import { formatMoney } from "@/lib/currency";
import type { AdminUserRow } from "@/lib/admin-types";

export function UsersTable({
  users,
  onChanged,
}: {
  users: AdminUserRow[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function toggleLock(userId: string, isCurrentlyLocked: boolean) {
    setBusyId(userId);
    try {
      await adminToggleUserLockFn({
        data: { userId, lock: !isCurrentlyLocked },
      });
      toast.success(isCurrentlyLocked ? "Account unlocked by admin" : "Account locked");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lock update failed");
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
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Balance</th>
            <th className="px-4 py-3 font-semibold">Security Status</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Quick adjust</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const locked = u.isLocked || (u.failedAttempts ?? 0) >= 3;
            return (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">{u.username}</div>
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
                      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">
                        LOCKED ({u.failedAttempts ?? 3}/3)
                      </span>
                    ) : (
                      <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-bold text-lime">
                        ACTIVE
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void toggleLock(u.id, locked)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold hover:bg-panel-hover disabled:opacity-50 ${
                        locked ? "border-lime text-lime" : "border-danger text-danger"
                      }`}
                    >
                      {locked ? "Unlock Account" : "Lock"}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("en-PH")}
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
  );
}
