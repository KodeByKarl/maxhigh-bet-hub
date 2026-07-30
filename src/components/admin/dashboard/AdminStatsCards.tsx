import type { AdminDashboardStats } from "@/lib/admin-types";
import {
  Coins,
  Trophy,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { adminGlassElevated } from "../ui/glass";
import { AdminSparkline } from "./AdminSparkline";
import { Link } from "@tanstack/react-router";

// Sparkline seed data per card (decorative)
const SPARKLINE_SEEDS = {
  wallet: [18, 15, 17, 14, 16, 13, 15, 12, 14, 11],
  bets:   [6, 9, 8, 12, 10, 14, 13, 16, 15, 18],
  wins:   [3, 5, 4, 8, 6, 9, 8, 11, 10, 13],
  net:    [12, 14, 11, 15, 10, 13, 9, 12, 8, 10],
};

interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  borderColor: string;
  accentColor: string;
  sparkTone: "violet" | "green" | "cyan" | "amber" | "rose";
  sparkPoints: number[];
  sparkPositive: boolean;
  trendPct: string;
  trendUp: boolean | null;
  isHero: boolean;
}

export function AdminStatsCards({ stats }: { stats: AdminDashboardStats | null }) {
  const netPositive = (stats?.netEarnings ?? 0) >= 0;

  const cards: StatCard[] = [
    {
      label: "Agent Wallet",
      value: stats?.labels.agentBalance ?? "₱0.00",
      sub: "Available for player credits",
      icon: Wallet,
      borderColor: "border-l-amber-500",
      accentColor: "#F59E0B",
      sparkTone: "amber",
      sparkPoints: SPARKLINE_SEEDS.wallet,
      sparkPositive: true,
      trendPct: "Live",
      trendUp: null,
      isHero: true,
    },
    {
      label: "Total Turnover",
      value: stats?.labels.betVolume ?? "₱0.00",
      sub: `${stats?.labels.totalBets ?? "0"} total wagers`,
      icon: Coins,
      borderColor: "border-l-violet-500",
      accentColor: "#8B5CF6",
      sparkTone: "violet",
      sparkPoints: SPARKLINE_SEEDS.bets,
      sparkPositive: true,
      trendPct: "+8.4%",
      trendUp: true,
      isHero: false,
    },
    {
      label: "Player Payouts",
      value: stats?.labels.winVolume ?? "₱0.00",
      sub: `${stats?.labels.liveWins24h ?? "0"} wins today`,
      icon: Trophy,
      borderColor: "border-l-cyan-500",
      accentColor: "#22D3EE",
      sparkTone: "cyan",
      sparkPoints: SPARKLINE_SEEDS.wins,
      sparkPositive: true,
      trendPct: "+5.2%",
      trendUp: true,
      isHero: false,
    },
    {
      label: "Net Revenue",
      value: stats?.labels.netEarnings ?? "₱0.00",
      sub: netPositive ? "House in profit" : "Payouts exceeding wagers",
      icon: netPositive ? TrendingUp : TrendingDown,
      borderColor: netPositive ? "border-l-emerald-500" : "border-l-rose-500",
      accentColor: netPositive ? "#10B981" : "#F43F5E",
      sparkTone: netPositive ? "green" : "rose",
      sparkPoints: SPARKLINE_SEEDS.net,
      sparkPositive: netPositive,
      trendPct: netPositive ? "+12.1%" : "-4.3%",
      trendUp: netPositive,
      isHero: false,
    },
  ];

  return (
    <div className="space-y-3">
      {/* ── Main KPI Cards ─────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`${adminGlassElevated} border-l-2 ${c.borderColor} p-5 relative overflow-hidden group`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06]"
                  >
                    <Icon size={17} style={{ color: c.accentColor }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/45 leading-tight">
                    {c.label}
                  </span>
                </div>

                {/* Badge or action */}
                {c.isHero ? (
                  <Link
                    to="/admin/fund"
                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus size={11} />
                    Top-up
                  </Link>
                ) : c.trendUp !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      c.trendUp
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {c.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {c.trendPct}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 text-[11px] font-bold text-white/30">
                    {c.trendPct}
                  </span>
                )}
              </div>

              {/* Value */}
              <div className="text-3xl sm:text-4xl font-black tabular-nums text-white tracking-tight leading-none">
                {c.value}
              </div>

              {/* Sub text */}
              <div className="mt-1.5 text-[11px] text-white/40 leading-snug">
                {c.sub}
              </div>

              {/* Sparkline */}
              <div className="mt-3 -mx-1">
                <AdminSparkline
                  tone={c.sparkTone}
                  points={c.sparkPoints}
                  positive={c.sparkPositive}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Secondary KPI Strip ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06] bg-[rgba(12,10,22,0.7)]">
        {[
          {
            icon: Users,
            label: "Total Players",
            value: stats?.labels.totalPlayers ?? "0",
            color: "#8B5CF6",
          },
          {
            icon: Coins,
            label: "Total Wagers",
            value: stats?.labels.totalBets ?? "0",
            color: "#F59E0B",
          },
          {
            icon: Target,
            label: "Biggest Win 24h",
            value: stats?.labels.biggestWin24h ?? "₱0.00",
            color: "#22D3EE",
          },
          {
            icon: Zap,
            label: "Live Wins (24h)",
            value: stats?.labels.liveWins24h ?? "0",
            color: "#10B981",
          },
        ].map(({ icon: SIcon, label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
          >
            <SIcon size={14} className="shrink-0" style={{ color }} />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider truncate">
                {label}
              </div>
              <div className="text-sm font-black tabular-nums text-white">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
