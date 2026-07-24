import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listSuperUsersFn,
  superAdjustBalanceFn,
  superCreateUserFn,
  superSetUserRoleFn,
  superUpdateUserFn,
} from "@/functions/superadmin";
import type { SuperUserRow } from "@/lib/superadmin-types";
import type { UserRole } from "@/lib/user";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

export const Route = createFileRoute("/superadmin/users")({
  component: SuperUsersPage,
});

function SuperUsersPage() {
  const { user, isReady } = useAuth();
  const [rows, setRows] = useState<SuperUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [editing, setEditing] = useState<SuperUserRow | null>(null);

  const load = useCallback(async () => {
    const data = await listSuperUsersFn({ data: { q: q || undefined, role, limit: 200 } });
    setRows(data);
  }, [q, role]);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => setRows([]));
  }, [isReady, user, load]);

  async function setUserRole(userId: string, next: UserRole) {
    try {
      await superSetUserRoleFn({ data: { userId, role: next } });
      toast.success("Role updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function credit(userId: string, delta: number) {
    try {
      await superAdjustBalanceFn({ data: { userId, delta, note: "Superadmin credit" } });
      toast.success("Balance updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Player List</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all accounts, create users, edit profile, username, and password.
        </p>
      </div>

      <CreateForm onCreated={() => void load()} />

      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-11 max-w-xs rounded-xl border-amber-500/20 bg-white/[0.06] text-foreground"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "all")}
          className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm text-foreground [color-scheme:dark]"
        >
          <option value="all" className="bg-white text-stone-900">
            All roles
          </option>
          <option value="player" className="bg-white text-stone-900">
            Players
          </option>
          <option value="admin" className="bg-white text-stone-900">
            Admins
          </option>
          <option value="superadmin" className="bg-white text-stone-900">
            Superadmins
          </option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
        >
          Refresh
        </button>
      </div>

      <div className={`${saGlass} overflow-x-auto`}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Controls</th>
              <th className="px-4 py-3">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.06]">
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">@{u.username}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                  {u.displayName && (
                    <div className="text-[11px] text-muted-foreground">{u.displayName}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => void setUserRole(u.id, e.target.value as UserRole)}
                    className="h-9 rounded-lg border border-amber-500/20 bg-[#1C1916] px-2 text-xs text-foreground [color-scheme:dark]"
                  >
                    <option value="player">player</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(u.balance)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {[100, 500, 1000].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => void credit(u.id, n)}
                        className="rounded-lg border border-amber-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-white/[0.06]"
                      >
                        +₱{n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void credit(u.id, -100)}
                      className="rounded-lg border border-amber-500/20 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-white/[0.06]"
                    >
                      −₱100
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditing(u)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/[0.06]"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [balance, setBalance] = useState("1000");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await superCreateUserFn({
        data: {
          email: email.trim() || undefined,
          username,
          password,
          role,
          balance: Number(balance) || 0,
        },
      });
      toast.success("Account created");
      setEmail("");
      setUsername("");
      setPassword("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${saGlass} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5`}>
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        placeholder="Username"
        className="h-11 rounded-xl bg-white/[0.06] text-foreground"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email (optional)"
        className="h-11 rounded-xl bg-white/[0.06] text-foreground"
      />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        placeholder="Password"
        className="h-11 rounded-xl bg-white/[0.06] text-foreground"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm text-foreground [color-scheme:dark]"
      >
        <option value="player">player</option>
        <option value="admin">admin</option>
        <option value="superadmin">superadmin</option>
      </select>
      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-xl bg-amber-500 text-sm font-bold text-black disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create"}
      </button>
      <Input
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        type="number"
        min={0}
        placeholder="Start balance"
        className="h-11 rounded-xl bg-white/[0.06] text-foreground sm:col-span-2"
      />
    </form>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: SuperUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await superUpdateUserFn({
        data: {
          userId: user.id,
          username: username.trim(),
          email: email.trim() || null,
          displayName: displayName.trim() || null,
          ...(password.trim() ? { password: password.trim() } : {}),
        },
      });
      toast.success("User updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`${saGlass} w-full max-w-md space-y-3 p-5 shadow-xl`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit @{user.username}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.06]">
            <X size={18} />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Username</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Email</span>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Optional"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Display name</span>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">
            New password
          </span>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Leave blank to keep current"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-amber-500/25 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
