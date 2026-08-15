import { useCallback, useEffect, useState } from "react";
import { getPlatformEarningsGraphFn } from "@/functions/superadmin";
import { formatMoney } from "@/lib/currency";
import { saGlass } from "@/components/superadmin/ui/glass";
import { TrendingUp } from "lucide-react";

type EarningsPoint = {
  label: string;
  bets: number;
  wins: number;
  netEarnings: number;
};

type EarningsData = {
  todayNet: number;
  thisWeekNet: number;
  thisMonthNet: number;
  allTimeNet: number;
  points: EarningsPoint[];
};

export function EarningsGraph() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPlatformEarningsGraphFn({ data: { period } });
      setData(res as EarningsData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const points = data?.points ?? [];
  const maxVal = Math.max(1, ...(points.length > 0 ? points.map((p) => Math.abs(p.netEarnings)) : [1000]));

  return (
    <div className={`${saGlass} space-y-3 p-3 sm:space-y-4 sm:p-5`}>
      <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" />
          <h2 className="text-sm font-bold text-foreground sm:text-lg">Earnings Trend</h2>
        </div>

        <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:flex sm:w-auto sm:items-center sm:gap-1.5">
          {(
            [
              { id: "day", label: "Daily (24h)", short: "24h" },
              { id: "week", label: "Weekly (7d)", short: "7d" },
              { id: "month", label: "Monthly (12m)", short: "12m" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs ${
                period === p.id
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">{p.short}</span>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3">
          <div className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">Today's Net</div>
          <div className={`mt-1 text-sm font-black sm:text-lg ${ (data?.todayNet ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(data?.todayNet ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3">
          <div className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">This Week</div>
          <div className={`mt-1 text-sm font-black sm:text-lg ${ (data?.thisWeekNet ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(data?.thisWeekNet ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3">
          <div className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">This Month</div>
          <div className={`mt-1 text-sm font-black sm:text-lg ${ (data?.thisMonthNet ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(data?.thisMonthNet ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 sm:p-3">
          <div className="text-[10px] font-bold text-amber-300 sm:text-[11px]">All-Time Net</div>
          <div className="mt-1 text-sm font-black text-amber-400 sm:text-lg">
            {formatMoney(data?.allTimeNet ?? 0)}
          </div>
        </div>
      </div>

      {/* Interactive Bar/Trend Visualizer */}
      <div className="pt-2">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground sm:h-44">Loading earnings chart…</div>
        ) : !data || !data.points || data.points.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground sm:h-44">No earnings data recorded yet.</div>
        ) : (
          <div className="space-y-2">
            <div className="flex h-32 items-end justify-between gap-1 border-b border-white/10 px-1 pb-2 pt-3 sm:h-44 sm:gap-1.5 sm:px-2 sm:pt-4">
              {data.points.map((pt, idx) => {
                const heightPct = Math.max(8, Math.round((Math.abs(pt.netEarnings) / maxVal) * 100));
                const isPositive = pt.netEarnings >= 0;

                return (
                  <div key={idx} className="group relative flex-1 flex flex-col items-center h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none rounded-lg bg-black/90 border border-white/20 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-xl">
                      <div className="font-bold">{pt.label}</div>
                      <div>Net: {formatMoney(pt.netEarnings)}</div>
                      <div className="text-muted-foreground text-[9px]">Bets: ₱{pt.bets.toLocaleString()} | Wins: ₱{pt.wins.toLocaleString()}</div>
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isPositive
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-125"
                          : "bg-gradient-to-t from-rose-600 to-rose-400 group-hover:brightness-125"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground px-2">
              {data.points.filter((_, idx) => idx % Math.ceil(data.points.length / 8) === 0).map((pt, idx) => (
                <span key={idx}>{pt.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
