import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSuperDashboardFn } from "@/functions/superadmin";
import type { SuperDashboard } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { EarningsGraph } from "@/components/superadmin/EarningsGraph";
import {
  Coins,
  Trophy,
  TrendingUp,
  Target,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/superadmin/")({
  component: SuperDashboardPage,
});

function SuperDashboardPage() {
  const { user, isReady } = useAuth();
  const [dash, setDash] = useState<SuperDashboard | null>(null);
  const name = (user?.displayName || user?.username || "Superadmin").split(" ")[0];

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    let cancelled = false;
    getSuperDashboardFn()
      .then((d) => {
        if (!cancelled) setDash(d);
      })
      .catch(() => {
        if (!cancelled) setDash(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  const cards = [
    {
      label: "Total Chip Outflow (Nailabas na Chips)",
      value: dash?.labels.chipOutflow ?? "₱0.00",
      sub: "Total deposits & staff chip allocations",
      icon: Coins,
      tone: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    {
      label: "Total Player Winnings (Payouts)",
      value: dash?.labels.winVolume ?? "₱0.00",
      sub: "Total player win volume across all games",
      icon: Trophy,
      tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    },
    {
      label: "Platform Net Earnings (Gains)",
      value: dash?.labels.netEarnings ?? "₱0.00",
      sub: "Total Bets − Total Wins",
      icon: TrendingUp,
      tone: (dash?.netEarnings ?? 0) >= 0 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10",
    },
    {
      label: "Recovery Target Needed (Kailangan Habulin)",
      value: dash?.labels.recoveryTarget ?? "₱0.00",
      sub: (dash?.recoveryTarget ?? 0) > 0 ? "Deficit to recover player payouts" : "House is profitable · No deficit",
      icon: Target,
      tone: (dash?.recoveryTarget ?? 0) > 0 ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Advanced Financial Command Center, {name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Real-time platform financial monitoring: chip outflow, player payouts, house net profit, and recovery target tracking.
        </p>
      </div>

      {/* Advanced Financial Monitoring Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${saGlass} p-5 border ${c.tone} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={20} className={c.tone.split(" ")[0]} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </span>
                </div>
                <ArrowUpRight size={16} className="text-muted-foreground" />
              </div>
              <div className="text-2xl font-black tabular-nums text-foreground">{c.value}</div>
              <div className="text-[11px] font-semibold text-muted-foreground">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Earnings & Outflow Graph */}
      <div className="space-y-4">
        <EarningsGraph />
      </div>

      {/* Secondary Financial Risk & Volume Pulse */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${saGlass} p-5 lg:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-foreground">Turnover & Exposure Balance</h2>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Metrics</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-semibold text-muted-foreground">Total Turnovers (Bets)</div>
              <div className="mt-1 text-2xl font-black text-foreground">{dash?.labels.betVolume ?? "₱0.00"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{dash?.labels.totalBets ?? "0"} total wagers placed</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-semibold text-muted-foreground">Progressive Mega Jackpot</div>
              <div className="mt-1 text-2xl font-black text-amber-300">{dash?.labels.jackpot ?? "₱0.00"}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Active progressive jackpot pool</div>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="text-xs font-bold text-amber-300">Weekly Exposure Limit</div>
              <div className="mt-1 text-lg font-black text-foreground">
                {dash?.labels.weeklyUsage ?? "₱0"} / <span className="text-amber-400">{dash?.labels.weeklyLimit ?? "₱20,000"}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: dash?.labels.weeklyPct ?? "0%" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`${saGlass} p-5 space-y-4`}>
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h2 className="text-base font-bold text-foreground">Financial Health Status</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex justify-between items-center">
              <span className="text-muted-foreground">House Profit Margin</span>
              <span className={`font-bold ${ (dash?.netEarnings ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {dash?.betVolume ? `${Math.round(((dash.netEarnings) / dash.betVolume) * 100)}%` : "100%"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex justify-between items-center">
              <span className="text-muted-foreground">Payout vs Wager Ratio</span>
              <span className="font-bold text-cyan-400">
                {dash?.betVolume ? `${Math.round((dash.winVolume / dash.betVolume) * 100)}%` : "0%"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex justify-between items-center">
              <span className="text-muted-foreground">Chip Outflow Safety</span>
              <span className="font-bold text-amber-300">Monitored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
