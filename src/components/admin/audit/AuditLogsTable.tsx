import type { AdminAuditLogRow } from "@/lib/admin-types";

function actionTone(action: string) {
  if (action.includes("login")) return "bg-cyan-500/15 text-cyan-800";
  if (action.includes("create")) return "bg-emerald-500/15 text-emerald-700";
  if (action.includes("balance") || action.includes("wallet")) return "bg-amber-500/15 text-amber-800";
  return "bg-muted text-muted-foreground";
}

export function AuditLogsTable({ logs }: { logs: AdminAuditLogRow[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
        No audit logs yet. Admin actions will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 font-semibold">Actor</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Summary</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/60 align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleString("en-PH")}
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">@{log.actorUsername}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${actionTone(log.action)}`}
                >
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground/90">
                <div>{log.summary}</div>
                {log.targetType && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ""}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
