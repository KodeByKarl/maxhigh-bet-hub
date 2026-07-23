import { Trophy } from "lucide-react";

const rows = [
  { rank: 1, user: "chipking", wager: "$284,921", prize: "$12,500" },
  { rank: 2, user: "royalflush", wager: "$212,410", prize: "$7,500" },
  { rank: 3, user: "highroller", wager: "$198,732", prize: "$5,000" },
  { rank: 4, user: "moonshot", wager: "$142,109", prize: "$2,500" },
  { rank: 5, user: "acesnaces", wager: "$118,204", prize: "$1,500" },
];

const rankColor = (r: number) =>
  r === 1 ? "#EAB308" : r === 2 ? "#8B85A8" : r === 3 ? "#B45309" : "#2A2640";

export function Leaderboard() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-lime" />
        <h2 className="text-lg font-bold text-foreground">Race Leaderboard</h2>
        <span className="ml-auto rounded-full bg-panel px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Ends in 06:12:44
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-panel">
        <div className="grid grid-cols-[64px_1fr_1fr_auto] gap-3 border-b border-border px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <div>Rank</div><div>Player</div><div className="text-right">Wagered</div><div className="text-right">Prize</div>
        </div>
        {rows.map((r) => (
          <div key={r.rank} className="grid grid-cols-[64px_1fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-panel-hover">
            <div>
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-black text-[#0A0912]"
                style={{ backgroundColor: rankColor(r.rank) }}
              >
                {r.rank}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 shrink-0 rounded-full bg-primary" />
              <span className="truncate text-sm font-semibold text-foreground">{r.user}</span>
            </div>
            <div className="text-right text-sm font-bold tabular-nums text-foreground">{r.wager}</div>
            <div className="text-right text-sm font-black tabular-nums text-lime">{r.prize}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
