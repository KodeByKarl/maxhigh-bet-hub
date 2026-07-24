import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminDashboardFn, listAdminAuditLogsFn } from "@/functions/admin";
import { AdminStatsCards } from "@/components/admin/dashboard/AdminStatsCards";
import { AdminRecentActivity } from "@/components/admin/dashboard/AdminRecentActivity";
import { AdminPlatformPulse } from "@/components/admin/dashboard/AdminPlatformPulse";
import { AdminInsightCard } from "@/components/admin/dashboard/AdminInsightCard";
import type { AdminAuditLogRow, AdminDashboardStats } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function todayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function AdminDashboardPage() {
  const { user, isReady } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const firstName = (user?.displayName || user?.username || "Admin").split(" ")[0];

  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    let cancelled = false;
    (async () => {
      try {
        const dash = await getAdminDashboardFn();
        if (!cancelled) setStats(dash);
      } catch {
        if (!cancelled) setStats(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  // Recent activity follows the selected weekday (audit + game events)
  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    let cancelled = false;
    (async () => {
      try {
        const audit = await listAdminAuditLogsFn({
          data: { limit: 8, dayIndex: selectedDay, scope: "system" },
        });
        if (!cancelled) setLogs(audit);
      } catch {
        if (!cancelled) setLogs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, user, selectedDay]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            Here&apos;s what&apos;s happening across MaxHigh today.
          </p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(139,92,246,0.45)] transition hover:brightness-110"
        >
          <Plus size={16} />
          Add user
        </Link>
      </div>

      <AdminStatsCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AdminRecentActivity logs={logs} />
        <AdminPlatformPulse selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminInsightCard stats={stats} />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-white">Quick links</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              to="/admin/users"
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.06]"
            >
              Manage users
            </Link>
            <Link
              to="/admin/audit"
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.06]"
            >
              Review audit logs
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <div className="text-lg font-bold text-white">{stats?.labels.totalUsers ?? "—"}</div>
              <div className="text-[10px] text-white/40">Users</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <div className="text-lg font-bold text-white">{stats?.labels.totalAdmins ?? "—"}</div>
              <div className="text-[10px] text-white/40">Staff</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <div className="text-lg font-bold text-white">{stats?.labels.totalBets ?? "—"}</div>
              <div className="text-[10px] text-white/40">Bets</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
