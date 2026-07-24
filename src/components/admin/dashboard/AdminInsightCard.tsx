import type { AdminDashboardStats } from "@/lib/admin-types";
import { adminGlass } from "../ui/glass";
import { Sparkles } from "lucide-react";

export function AdminInsightCard({ stats }: { stats: AdminDashboardStats | null }) {
  const players = stats?.totalPlayers ?? 0;
  const wins = stats?.liveWins24h ?? 0;
  const volume = stats?.labels.betVolume ?? "₱0.00";

  return (
    <section className={`${adminGlass} p-5`}>
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-300">
          <Sparkles size={16} />
        </div>
        <h2 className="text-sm font-semibold text-white">Ops summary</h2>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">
        Platform has <span className="font-semibold text-white">{players}</span> players with{" "}
        <span className="font-semibold text-emerald-300">{wins}</span> recorded wins in the last 24h.
        Lifetime bet volume sits at <span className="font-semibold text-violet-200">{volume}</span>.
        Review audit logs after any balance adjustment.
      </p>
    </section>
  );
}
