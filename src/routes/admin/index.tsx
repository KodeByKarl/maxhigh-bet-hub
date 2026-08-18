import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminDashboardFn, listAdminAuditLogsFn } from "@/functions/admin";
import { AdminStatsCards } from "@/components/admin/dashboard/AdminStatsCards";
import { AdminRecentActivity } from "@/components/admin/dashboard/AdminRecentActivity";
import { AdminPlatformPulse } from "@/components/admin/dashboard/AdminPlatformPulse";
import { AdminEarningsChart } from "@/components/admin/dashboard/AdminEarningsChart";
import type { AdminAuditLogRow, AdminDashboardStats } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { adminGlass, adminGlassElevated } from "@/components/admin/ui/glass";
import { AGENT_MASTER_PROMOTE_HINT } from "@/lib/agent-promotion";
import {
  Plus,
  ScrollText,
  Users,
  Headphones,
  ShieldCheck,
  ArrowRight,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function todayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function AdminDashboardPage() {
  const { user, isReady } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const now = useLiveClock();

  const firstName = (user?.displayName || user?.username || "Admin").split(" ")[0];
  const roleLabel =
    user?.role === "master_agent"
      ? "Master Agent"
      : user?.role === "agent"
        ? "Agent"
        : "Admin";

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
    return () => { cancelled = true; };
  }, [isReady, user]);

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
    return () => { cancelled = true; };
  }, [isReady, user, selectedDay]);

  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4 pb-2 sm:space-y-5 sm:pb-8">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/[0.12] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-300 sm:mb-2 sm:px-3 sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            {roleLabel}
          </div>

          <h1 className="text-xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
            Command Center, {firstName}
          </h1>

          <p className="mt-1 max-w-lg text-xs leading-relaxed text-white/45 sm:text-sm">
            <span className="sm:hidden">Players, chips, turnover, and earnings.</span>
            <span className="hidden sm:inline">
              Real-time control over player accounts, wallet chips, turnover volume, and earnings.
            </span>
          </p>
          {user?.role === "agent" && (
            <p className="mt-2 text-xs font-semibold text-violet-300">
              {AGENT_MASTER_PROMOTE_HINT}
            </p>
          )}
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 sm:px-3.5 sm:py-2">
            <Clock size={14} className="text-white/30" />
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-white">{timeStr}</div>
              <div className="hidden text-[10px] text-white/30 sm:block">{dateStr}</div>
            </div>
          </div>

          <Link
            to="/admin/users"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-95 sm:px-5"
          >
            <Plus size={15} />
            Add Player
          </Link>
        </div>
      </div>

      {/* ── KPI Cards + Secondary Strip ───────────────────────────── */}
      <AdminStatsCards stats={stats} />

      {/* ── Bitcoin-style Earnings Chart ──────────────────────────── */}
      <AdminEarningsChart />

      {/* ── Activity + Pulse ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <AdminRecentActivity logs={logs} />
        <AdminPlatformPulse selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </div>

      {/* ── Quick Actions + Wallet Rules ──────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Quick Actions */}
        <div className={`${adminGlass} space-y-3 p-4 sm:space-y-4 sm:p-5`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white">Quick Actions</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70">
              Shortcuts
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                to: "/admin/users" as const,
                params: undefined,
                icon: Users,
                color: "bg-violet-500/15 border-violet-400/20 text-violet-300",
                label: "Player Accounts",
                sub: `${stats?.labels.totalPlayers ?? "0"} players under you`,
              },
              {
                to: "/admin/reports/$view" as const,
                params: { view: "winlose" },
                icon: ScrollText,
                color: "bg-emerald-500/15 border-emerald-400/20 text-emerald-300",
                label: "Reports Suite",
                sub: "Win/Lose & Payouts",
              },
              {
                to: "/admin/support" as const,
                params: undefined,
                icon: Headphones,
                color: "bg-cyan-500/15 border-cyan-400/20 text-cyan-300",
                label: "Live Support",
                sub: "Assist active players",
              },
            ].map(({ to, params, icon: NavIcon, color, label, sub }) => (
              <Link
                key={label}
                to={to}
                params={params as any}
                className={`${adminGlassElevated} flex items-center justify-between p-3.5 group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl border ${color}`}>
                    <NavIcon size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[10px] text-white/40">{sub}</div>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-white/25 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Wallet Rules */}
        <div className={`${adminGlass} space-y-3 p-4 sm:space-y-4 sm:p-5`}>
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 border border-emerald-400/20">
              <ShieldCheck size={15} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Wallet Rules</h2>
          </div>

          <div className="space-y-3">
            {/* Alert card */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <span>💡</span>
                Auto Wallet Deduction
              </div>
              <p className="text-[11px] text-white/55 leading-relaxed">
                Adding chips to players or setting initial account balances deducts chips directly
                from your Agent Wallet&nbsp;
                <span className="font-bold text-amber-300">
                  ({stats?.labels.agentBalance ?? "₱0.00"})
                </span>
                .
              </p>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
