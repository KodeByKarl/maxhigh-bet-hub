import { useEffect, useState } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { getLiveWinsFn } from "@/functions/api";

export type LiveWin = {
  user: string;
  game: string;
  amt: string;
  color?: string;
};

export function LiveWinsTicker() {
  const [wins, setWins] = useState<LiveWin[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getLiveWinsFn();
        if (!cancelled) setWins(rows);
      } catch {
        if (!cancelled) setWins([]);
      }
    };
    void load();
    const id = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const row = wins.length > 0 ? [...wins, ...wins] : [];

  return (
    <div className="flex items-stretch border-b border-border bg-sidebar">
      <div className="flex shrink-0 items-center gap-2 border-r border-border bg-panel px-3 py-2 sm:px-4">
        <Flame size={14} className="text-danger" />
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
          Live Wins
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {row.length === 0 ? (
          <div className="flex items-center gap-2 py-2 pl-4 text-xs text-muted-foreground">
            <TrendingUp size={12} className="text-lime" />
            <span>Waiting for live wins…</span>
          </div>
        ) : (
          <div className="flex animate-[ticker_60s_linear_infinite] gap-6 whitespace-nowrap py-2 pl-4">
            {row.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <TrendingUp size={12} className="text-lime" />
                <span className="font-semibold text-muted-foreground">{w.user}</span>
                <span className="text-muted-foreground">on</span>
                <span className="font-bold text-foreground">{w.game}</span>
                <span className="font-black tabular-nums" style={{ color: w.color ?? "#C6FF3D" }}>
                  {w.amt}
                </span>
                <span className="text-border">•</span>
              </div>
            ))}
          </div>
        )}
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
