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
      short: "Chip Outflow",
      value: dash?.labels.chipOutflow ?? "₱0.00",
      sub: "Total deposits across the platform",
      icon: Coins,
      tone: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    {
      label: "Total Player Winnings (Payouts)",
      short: "Player Payouts",
      value: dash?.labels.winVolume ?? "₱0.00",
      sub: "Total player win volume across all games",
      icon: Trophy,
      tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    },
    {
      label: "Platform Net Earnings (Gains)",
      short: "Net Earnings",
      value: dash?.labels.netEarnings ?? "₱0.00",
      sub: "Total Bets − Total Wins",
      icon: TrendingUp,
      tone: (dash?.netEarnings ?? 0) >= 0 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10",
    },
    {
      label: "Recovery Target Needed (Kailangan Habulin)",
      short: "Recovery Target",
      value: dash?.labels.recoveryTarget ?? "₱0.00",
      sub: (dash?.recoveryTarget ?? 0) > 0 ? "Deficit to recover player payouts" : "House is profitable · No deficit",
      icon: Target,
      tone: (dash?.recoveryTarget ?? 0) > 0 ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    },
  ];

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">Live financials</p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          <span className="sm:hidden">Command Center, {name}</span>
          <span className="hidden sm:inline">Advanced Financial Command Center, {name}</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
          <span className="sm:hidden">Chip outflow, payouts, house net, and recovery.</span>
          <span className="hidden sm:inline">
            Real-time platform financial monitoring: chip outflow, player payouts, house net profit, and recovery target tracking.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${saGlass} p-3 sm:p-5 border ${c.tone} space-y-1.5 sm:space-y-3`}>
              <div className="flex items-start gap-2">
                <Icon size={16} className={`mt-0.5 shrink-0 ${c.tone.split(" ")[0]}`} />
                <span className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-wider text-muted-foreground sm:text-[11px]">
                  <span className="sm:hidden">{c.short}</span>
                  <span className="hidden sm:inline">{c.label}</span>
                </span>
              </div>
              <div className="truncate text-lg font-black tabular-nums text-foreground sm:text-2xl">{c.value}</div>
              <div className="hidden text-[11px] font-semibold text-muted-foreground sm:block">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <EarningsGraph />
      </div>

      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        <div className={`${saGlass} p-4 sm:p-5 lg:col-span-2 space-y-3 sm:space-y-4`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3">
            <h2 className="text-sm font-bold text-foreground sm:text-base">Turnover & Exposure</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 sm:text-xs">Live</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
              <div className="text-[10px] font-semibold text-muted-foreground sm:text-xs">Turnovers (Bets)</div>
              <div className="mt-1 text-lg font-black text-foreground sm:text-2xl">{dash?.labels.betVolume ?? "₱0.00"}</div>
              <div className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{dash?.labels.totalBets ?? "0"} total wagers placed</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
              <div className="text-[10px] font-semibold text-muted-foreground sm:text-xs">Mega Jackpot</div>
              <div className="mt-1 text-lg font-black text-amber-300 sm:text-2xl">{dash?.labels.jackpot ?? "₱0.00"}</div>
              <div className="mt-1 hidden text-[11px] text-muted-foreground sm:block">Active progressive jackpot pool</div>
            </div>

            <div className="col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 sm:col-span-1 sm:p-4">
              <div className="text-[10px] font-bold text-amber-300 sm:text-xs">Weekly Exposure Limit</div>
              <div className="mt-1 text-base font-black text-foreground sm:text-lg">
                {dash?.labels.weeklyUsage ?? "₱0"} / <span className="text-amber-400">{dash?.labels.weeklyLimit ?? "₱20,000"}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: dash?.labels.weeklyPct ?? "0%" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`${saGlass} p-4 sm:p-5 space-y-3 sm:space-y-4`}>
          <div className="flex items-center gap-2 border-b border-white/10 pb-2.5 sm:pb-3">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-foreground sm:text-base">Financial Health</h2>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-1 sm:space-y-3 sm:gap-0">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:flex sm:items-center sm:justify-between sm:p-3">
              <span className="block text-[10px] text-muted-foreground sm:text-xs">House Margin</span>
              <span className={`mt-1 block font-bold sm:mt-0 ${ (dash?.netEarnings ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {dash?.betVolume ? `${Math.round(((dash.netEarnings) / dash.betVolume) * 100)}%` : "100%"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:flex sm:items-center sm:justify-between sm:p-3">
              <span className="block text-[10px] text-muted-foreground sm:text-xs">Payout Ratio</span>
              <span className="mt-1 block font-bold text-cyan-400 sm:mt-0">
                {dash?.betVolume ? `${Math.round((dash.winVolume / dash.betVolume) * 100)}%` : "0%"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:flex sm:items-center sm:justify-between sm:p-3">
              <span className="block text-[10px] text-muted-foreground sm:text-xs">Outflow</span>
              <span className="mt-1 block font-bold text-amber-300 sm:mt-0">Monitored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
