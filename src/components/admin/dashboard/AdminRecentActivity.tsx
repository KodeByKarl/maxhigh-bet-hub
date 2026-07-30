import { Link } from "@tanstack/react-router";
import type { AdminAuditLogRow } from "@/lib/admin-types";
import { adminGlass } from "../ui/glass";
import { Coins, LogIn, UserPlus, ScrollText, Activity } from "lucide-react";

function iconFor(action: string) {
  if (action.includes("login")) return LogIn;
  if (action.includes("create")) return UserPlus;
  if (action.includes("balance")) return Coins;
  return ScrollText;
}

interface Priority {
  dot: string;
  pill: string;
  border: string;
  label: string;
}

function priority(action: string): Priority {
  if (action.includes("balance"))
    return {
      dot: "bg-rose-400",
      pill: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      border: "border-l-rose-500/70",
      label: "High",
    };
  if (action.includes("create"))
    return {
      dot: "bg-amber-400",
      pill: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      border: "border-l-amber-500/70",
      label: "Medium",
    };
  if (action.includes("login"))
    return {
      dot: "bg-emerald-400",
      pill: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      border: "border-l-emerald-500/70",
      label: "Low",
    };
  return {
    dot: "bg-violet-400",
    pill: "bg-violet-500/15 border-violet-500/30 text-violet-400",
    border: "border-l-violet-500/70",
    label: "Info",
  };
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export function AdminRecentActivity({ logs }: { logs: AdminAuditLogRow[] }) {
  return (
    <section className={`${adminGlass} flex h-full flex-col p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 border border-violet-400/20">
            <Activity size={15} className="text-violet-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">Recent Activity</h2>
            <p className="text-[10px] text-white/35 mt-0.5">Filtered by selected weekday</p>
          </div>
        </div>
        <Link
          to="/admin/reports/$view"
          params={{ view: "winlose" }}
          className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* List */}
      <div className="mt-4 flex-1 space-y-1.5">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.04] border border-white/[0.06]">
              <ScrollText size={18} className="text-white/20" />
            </div>
            <p className="text-sm text-white/30">No staff actions yet.</p>
          </div>
        ) : (
          logs.slice(0, 7).map((log, idx) => {
            const Icon = iconFor(log.action);
            const p = priority(log.action);
            return (
              <div
                key={log.id}
                className={`group flex items-center gap-3 rounded-xl border border-l-2 border-white/[0.05] bg-white/[0.025] hover:bg-white/[0.05] px-3 py-3 transition-all duration-200 ${p.border}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Icon */}
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/12 border border-violet-400/15 text-violet-300 group-hover:border-violet-400/30 transition-colors">
                  <Icon size={14} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white/85">{log.summary}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/35">
                    <span className="font-medium text-white/45">@{log.actorUsername}</span>
                    <span>·</span>
                    <span>{relativeTime(log.createdAt)}</span>
                  </div>
                </div>

                {/* Priority Pill */}
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                  {p.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
