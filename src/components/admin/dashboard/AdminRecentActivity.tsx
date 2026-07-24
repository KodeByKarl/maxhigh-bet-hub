import { Link } from "@tanstack/react-router";
import type { AdminAuditLogRow } from "@/lib/admin-types";
import { adminGlass } from "../ui/glass";
import { Coins, LogIn, UserPlus, ScrollText } from "lucide-react";

function iconFor(action: string) {
  if (action.includes("login")) return LogIn;
  if (action.includes("create")) return UserPlus;
  if (action.includes("balance")) return Coins;
  return ScrollText;
}

function priorityDot(action: string) {
  if (action.includes("balance")) return "bg-rose-400";
  if (action.includes("create")) return "bg-amber-400";
  if (action.includes("login")) return "bg-emerald-400";
  return "bg-violet-400";
}

function statusLabel(action: string) {
  if (action.includes("balance")) return "High";
  if (action.includes("create")) return "Medium";
  return "Low";
}

export function AdminRecentActivity({ logs }: { logs: AdminAuditLogRow[] }) {
  return (
    <section className={`${adminGlass} flex h-full flex-col p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Recent activity</h2>
        <Link to="/admin/audit" className="text-xs font-semibold text-violet-300 hover:text-violet-200">
          View all
        </Link>
      </div>
      <p className="mt-1 text-xs text-white/40">Filtered by the selected weekday</p>

      <div className="mt-4 flex-1 space-y-2">
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">No staff actions yet.</p>
        ) : (
          logs.slice(0, 6).map((log) => {
            const Icon = iconFor(log.action);
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{log.summary}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
                    <span>@{log.actorUsername}</span>
                    <span>·</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/45">
                  <span>{statusLabel(log.action)}</span>
                  <span className={`h-2 w-2 rounded-full ${priorityDot(log.action)}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
