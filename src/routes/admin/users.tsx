import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listAdminUsersFn } from "@/functions/admin";
import { CreateUserForm, UsersTable } from "@/components/admin";
import type { AdminUserRow } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user, isReady } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const load = useCallback(async (query?: string) => {
    const rows = await listAdminUsersFn({ data: { q: query || undefined, limit: 100 } });
    setUsers(rows);
  }, []);

  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    void load();
  }, [isReady, user, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Player List</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create accounts and adjust balances.
        </p>
      </div>

      <CreateUserForm onCreated={() => void load(q)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, username…"
          className="h-11 max-w-md rounded-xl border-border bg-panel"
        />
        <button
          type="button"
          onClick={() => void load(q)}
          className="h-11 rounded-xl border border-border bg-panel px-4 text-sm font-semibold hover:bg-panel-hover"
        >
          Search
        </button>
      </div>

      <UsersTable users={users} onChanged={() => void load(q)} />
    </div>
  );
}
