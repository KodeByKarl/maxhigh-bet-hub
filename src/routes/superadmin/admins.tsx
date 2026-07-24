import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listSuperUsersFn, superCreateUserFn, superSetUserRoleFn } from "@/functions/superadmin";
import type { SuperUserRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/admins")({
  component: SuperAdminsPage,
});

function SuperAdminsPage() {
  const { user, isReady } = useAuth();
  const [admins, setAdmins] = useState<SuperUserRow[]>([]);
  const [supers, setSupers] = useState<SuperUserRow[]>([]);

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([
      listSuperUsersFn({ data: { role: "admin", limit: 200 } }),
      listSuperUsersFn({ data: { role: "superadmin", limit: 50 } }),
    ]);
    setAdmins(a);
    setSupers(s);
  }, []);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => {
      setAdmins([]);
      setSupers([]);
    });
  }, [isReady, user, load]);

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control Domain 2 staff — create admins and demote when needed.
        </p>
      </div>

      <CreateAdminForm onCreated={() => void load()} />

      <StaffTable
        title="Domain 2 · Admins"
        rows={admins}
        onDemote={async (id) => {
          await superSetUserRoleFn({ data: { userId: id, role: "player" } });
          toast.success("Admin demoted to player");
          await load();
        }}
        onPromote={async (id) => {
          await superSetUserRoleFn({ data: { userId: id, role: "superadmin" } });
          toast.success("Promoted to superadmin");
          await load();
        }}
      />

      <StaffTable title="Domain 3 · Superadmins" rows={supers} />
    </div>
  );
}

function StaffTable({
  title,
  rows,
  onDemote,
  onPromote,
}: {
  title: string;
  rows: SuperUserRow[];
  onDemote?: (id: string) => Promise<void>;
  onPromote?: (id: string) => Promise<void>;
}) {
  return (
    <div className={`${saGlass} overflow-hidden`}>
      <div className="border-b border-amber-500/20 px-4 py-3 text-sm font-semibold text-foreground">{title}</div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No accounts in this group.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.06] last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">@{u.username}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-xs uppercase text-amber-700">{u.role}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {onPromote && (
                      <button
                        type="button"
                        onClick={() => void onPromote(u.id).catch((e) => toast.error(String(e.message ?? e)))}
                        className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/10"
                      >
                        Make superadmin
                      </button>
                    )}
                    {onDemote && (
                      <button
                        type="button"
                        onClick={() => void onDemote(u.id).catch((e) => toast.error(String(e.message ?? e)))}
                        className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10"
                      >
                        Demote
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateAdminForm({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await superCreateUserFn({
        data: { email: email.trim() || undefined, username, password, role: "admin", balance: 0 },
      });
      toast.success("Admin created");
      setEmail("");
      setUsername("");
      setPassword("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${saGlass} grid gap-3 p-4 sm:grid-cols-4`}>
      <Input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="h-11 rounded-xl bg-white/[0.06] text-foreground" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optional)" className="h-11 rounded-xl bg-white/[0.06] text-foreground" />
      <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-11 rounded-xl bg-white/[0.06] text-foreground" />
      <button type="submit" disabled={busy} className="h-11 rounded-xl bg-amber-500 text-sm font-bold text-black disabled:opacity-60">
        {busy ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
