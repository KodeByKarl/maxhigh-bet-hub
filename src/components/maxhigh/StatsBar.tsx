import { Trophy, Flame, Users, Coins } from "lucide-react";

const stats = [
  { label: "Total Bets", value: "42,918,204", icon: Coins, color: "#7C3AED" },
  { label: "Players Online", value: "18,204", icon: Users, color: "#0E7490" },
  { label: "Biggest Win 24h", value: "$412,900", icon: Trophy, color: "#EAB308" },
  { label: "Hot Streak", value: "127 wins", icon: Flame, color: "#DC2626" },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: s.color }}>
            <s.icon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="mt-0.5 truncate text-lg font-black tabular-nums text-foreground">{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
