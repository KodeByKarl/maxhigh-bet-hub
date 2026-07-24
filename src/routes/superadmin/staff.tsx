import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listAdminAuditLogsFn } from "@/functions/admin";
import { AuditLogsTable } from "@/components/admin/audit/AuditLogsTable";
import type { AdminAuditLogRow } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/superadmin/staff")({
  component: StaffActionsPage,
});

function StaffActionsPage() {
  const { user, isReady } = useAuth();
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(
        await listAdminAuditLogsFn({
          data: { q: q || undefined, limit: 200, scope: "system" },
        }),
      );
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load();
  }, [isReady, user, load]);

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Admin and superadmin audit trail.</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-11 max-w-md rounded-xl border-amber-500/20 bg-white/[0.06] text-foreground"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
        >
          Refresh
        </button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <AuditLogsTable logs={logs} />}
    </div>
  );
}
