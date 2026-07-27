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
  const [debouncedQ, setDebouncedQ] = useState("");
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminAuditLogsFn({
        data: { q: debouncedQ || undefined, limit: 200, scope: "system" },
      });
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load();
  }, [isReady, user, load]);

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Admin, Agent, Master Agent, and SuperAdmin audit log records.</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username, action, or summary…"
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
      {loading ? (
        <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading audit logs…
        </div>
      ) : (
        <AuditLogsTable logs={logs} />
      )}
    </div>
  );
}
