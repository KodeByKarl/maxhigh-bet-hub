import type { AdminDashboardStats } from "@/lib/admin-types";
import {
  Coins,
  Trophy,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { adminGlassElevated } from "../ui/glass";
import { AdminSparkline } from "./AdminSparkline";

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
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`${adminGlassElevated} relative overflow-hidden border-l-2 ${c.borderColor} p-3 sm:p-5 group`}
            >
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] sm:h-9 sm:w-9">
                    <Icon size={16} style={{ color: c.accentColor }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase leading-tight tracking-wider text-white/45 sm:text-[11px]">
                    {c.label}
                  </span>
                </div>

                {c.trendUp !== null ? (
                  <span
                    className={`hidden items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold sm:inline-flex ${
                      c.trendUp
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {c.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {c.trendPct}
                  </span>
                ) : (
                  <span className="hidden rounded-md border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-white/30 sm:inline-flex">
                    {c.trendPct}
                  </span>
                )}
              </div>

              <div className="truncate text-lg font-black tabular-nums leading-none tracking-tight text-white sm:text-3xl lg:text-4xl">
                {c.value}
              </div>

              <div className="mt-1 hidden text-[11px] leading-snug text-white/40 sm:mt-1.5 sm:block">
                {c.sub}
              </div>

              <div className="mt-2 hidden sm:mt-3 sm:block -mx-1">
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
      <div className="grid grid-cols-2 overflow-hidden divide-x divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-[rgba(12,10,22,0.7)] sm:grid-cols-4 sm:divide-y-0">
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
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors sm:gap-3 sm:px-4 sm:py-3"
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
