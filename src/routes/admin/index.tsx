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
import {
  Plus,
  Wallet,
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
    <div className="space-y-5 pb-8">

      {/* ── Header Banner ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Role pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/[0.12] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            {roleLabel}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Command Center, {firstName}
          </h1>

          <p className="text-sm text-white/45 max-w-lg leading-relaxed">
            Real-time control over player accounts, wallet chips, turnover volume, and earnings.
          </p>
        </div>

        {/* Right: time + action buttons */}
        <div className="flex flex-col items-end gap-3">
          {/* Live clock */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2">
            <Clock size={14} className="text-white/30" />
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-white">{timeStr}</div>
              <div className="text-[10px] text-white/30">{dateStr}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/users"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 text-sm font-bold text-white active:scale-95 transition-all"
            >
              <Plus size={15} />
              Add Player
            </Link>

            <Link
              to="/admin/fund"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/[0.10] px-4 text-sm font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
            >
              <Wallet size={15} />
              Fund / Top-up
            </Link>
          </div>
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
        <div className={`${adminGlass} p-5 space-y-4`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white">Agent Quick Actions</h2>
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
                to: "/admin/fund" as const,
                params: undefined,
                icon: Wallet,
                color: "bg-amber-500/15 border-amber-400/20 text-amber-300",
                label: "Fund In / Out",
                sub: "Request chip refills",
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
        <div className={`${adminGlass} p-5 space-y-4`}>
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 border border-emerald-400/20">
              <ShieldCheck size={15} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Agent Wallet Rules</h2>
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
