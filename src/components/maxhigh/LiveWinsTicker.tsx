import { Flame, TrendingUp } from "lucide-react";

const wins = [
  { user: "player_42", game: "Crash", amt: "+$1,284.20", color: "#C6FF3D" },
  { user: "highroller", game: "Mines", amt: "+$542.10", color: "#C6FF3D" },
  { user: "lucky_ace", game: "Wheel", amt: "+$9,120.00", color: "#C6FF3D" },
  { user: "vega$", game: "Dice", amt: "+$210.45", color: "#C6FF3D" },
  { user: "moonshot", game: "Limbo", amt: "+$3,001.99", color: "#C6FF3D" },
  { user: "chipking", game: "Slots", amt: "+$18,420.00", color: "#C6FF3D" },
  { user: "royal7", game: "Hilo", amt: "+$62.10", color: "#C6FF3D" },
  { user: "acesnaces", game: "Tower", amt: "+$4,872.30", color: "#C6FF3D" },
];

export function LiveWinsTicker() {
  const row = [...wins, ...wins];
  return (
    <div className="flex items-stretch border-b border-border bg-sidebar">
      <div className="flex shrink-0 items-center gap-2 border-r border-border bg-panel px-3 py-2 sm:px-4">
        <Flame size={14} className="text-danger" />
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
          Live Wins
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex animate-[ticker_60s_linear_infinite] gap-6 whitespace-nowrap py-2 pl-4">
          {row.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <TrendingUp size={12} className="text-lime" />
              <span className="font-semibold text-muted-foreground">{w.user}</span>
              <span className="text-muted-foreground">on</span>
              <span className="font-bold text-foreground">{w.game}</span>
              <span className="font-black tabular-nums" style={{ color: w.color }}>
                {w.amt}
              </span>
              <span className="text-border">•</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
