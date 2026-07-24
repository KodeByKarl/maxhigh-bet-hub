import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSuperDashboardFn } from "@/functions/superadmin";
import type { SuperDashboard } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Gamepad2, Gem, Shield, Users } from "lucide-react";

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
    { label: "Players", value: dash?.labels.totalPlayers, icon: Users, tone: "text-cyan-700" },
    { label: "Admins", value: dash?.labels.totalAdmins, icon: Shield, tone: "text-violet-700" },
    { label: "Games live", value: dash?.labels.gamesEnabled, icon: Gamepad2, tone: "text-emerald-400" },
    { label: "Mega Jackpot", value: dash?.labels.jackpot, icon: Gem, tone: "text-amber-700" },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Command center, {name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Domain 3 — advanced control over users, staff, games, and jackpot.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${saGlass} p-5`}>
              <div className="flex items-center justify-between">
                <Icon className={c.tone} size={20} />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</span>
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">{c.value ?? "—"}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${saGlass} p-5 lg:col-span-2`}>
          <h2 className="text-sm font-semibold text-foreground">Platform volume</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/[0.05] p-4">
              <div className="text-xs text-muted-foreground">Total bets</div>
              <div className="mt-1 text-xl font-bold text-foreground">{dash?.labels.totalBets ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-4">
              <div className="text-xs text-muted-foreground">Bet volume</div>
              <div className="mt-1 text-xl font-bold text-rose-400">{dash?.labels.betVolume ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-4">
              <div className="text-xs text-muted-foreground">Win volume</div>
              <div className="mt-1 text-xl font-bold text-emerald-400">{dash?.labels.winVolume ?? "—"}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-500/15 px-4 py-3 text-sm text-muted-foreground">
              Disabled games: <span className="font-bold text-foreground">{dash?.labels.gamesDisabled ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-amber-500/15 px-4 py-3 text-sm text-muted-foreground">
              Superadmins: <span className="font-bold text-amber-300">{dash?.labels.totalSuperadmins ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className={`${saGlass} p-5`}>
          <h2 className="text-sm font-semibold text-foreground">Quick control</h2>
          <div className="mt-4 flex flex-col gap-2">
            {[
              { to: "/superadmin/games" as const, label: "Enable / disable games" },
              { to: "/superadmin/admins" as const, label: "Manage admin staff" },
              { to: "/superadmin/users" as const, label: "Promote / credit users" },
              { to: "/superadmin/jackpot" as const, label: "Set Mega Jackpot" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-xl border border-amber-500/15 bg-white/[0.05] px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/10 hover:text-amber-200"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/superadmin/reports/$view"
              params={{ view: "winlose" }}
              className="rounded-xl border border-amber-500/15 bg-white/[0.05] px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/10 hover:text-amber-200"
            >
              Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
