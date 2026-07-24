import type { AdminDashboardStats } from "@/lib/admin-types";
import { Coins, Trophy, Users, Flame } from "lucide-react";
import { adminGlass } from "../ui/glass";
import { AdminSparkline } from "./AdminSparkline";

type Highlight = {
  key: keyof AdminDashboardStats["labels"];
  label: string;
  hint: (s: AdminDashboardStats | null) => string;
  icon: typeof Users;
  tone: "violet" | "green" | "cyan" | "amber";
  iconClass: string;
};

const highlights: Highlight[] = [
  {
    key: "totalPlayers",
    label: "Active players",
    hint: (s) => `${s?.labels.totalUsers ?? "—"} total accounts`,
    icon: Users,
    tone: "violet",
    iconClass: "bg-violet-500/20 text-violet-300",
  },
  {
    key: "liveWins24h",
    label: "Wins today",
    hint: () => "Last 24 hours",
    icon: Flame,
    tone: "cyan",
    iconClass: "bg-cyan-500/20 text-cyan-300",
  },
  {
    key: "betVolume",
    label: "Bet volume",
    hint: (s) => `${s?.labels.totalBets ?? "—"} total bets`,
    icon: Coins,
    tone: "green",
    iconClass: "bg-emerald-500/20 text-emerald-300",
  },
  {
    key: "biggestWin24h",
    label: "Biggest win",
    hint: () => "Peak payout · 24h",
    icon: Trophy,
    tone: "amber",
    iconClass: "bg-amber-500/20 text-amber-300",
  },
];

export function AdminStatsCards({ stats }: { stats: AdminDashboardStats | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {highlights.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={`${adminGlass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${card.iconClass}`}>
                <Icon size={18} />
              </div>
              <AdminSparkline tone={card.tone} />
            </div>
            <div className="mt-4 text-sm text-white/50">{card.label}</div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats?.labels[card.key] ?? "—"}
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-400/90">{card.hint(stats)}</div>
          </div>
        );
      })}
    </div>
  );
}
