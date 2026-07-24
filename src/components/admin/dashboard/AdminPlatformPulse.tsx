import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getAdminDayPulseFn } from "@/functions/admin";
import type { AdminDayPulse } from "@/lib/admin-types";
import { adminGlass } from "../ui/glass";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function todayIndex() {
  const jsDay = new Date().getDay(); // 0 Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function AdminPlatformPulse({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: number;
  onSelectDay: (dayIndex: number) => void;
}) {
  const [pulse, setPulse] = useState<AdminDayPulse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getAdminDayPulseFn({ data: { dayIndex: selectedDay } });
        if (!cancelled) setPulse(data);
      } catch {
        if (!cancelled) setPulse(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

  const bars = [
    {
      label: "Bets / Losses",
      value: pulse?.bets ?? 0,
      display: pulse?.labels.bets ?? "—",
      max: Math.max(pulse?.bets ?? 1, 1),
      color: "from-rose-500 to-orange-400",
    },
    {
      label: "Wins",
      value: pulse?.wins ?? 0,
      display: pulse?.labels.wins ?? "—",
      max: Math.max(pulse?.wins ?? 1, 1),
      color: "from-emerald-400 to-lime-400",
    },
    {
      label: "Bet volume",
      value: pulse?.betVolume ?? 0,
      display: pulse?.labels.betVolume ?? "—",
      max: Math.max(pulse?.betVolume ?? 1, 1),
      color: "from-violet-500 to-fuchsia-400",
    },
    {
      label: "Players active",
      value: pulse?.playersActive ?? 0,
      display: pulse?.labels.playersActive ?? "—",
      max: Math.max(pulse?.playersActive ?? 1, 1),
      color: "from-cyan-400 to-blue-500",
    },
  ];

  const isToday = selectedDay === todayIndex();

  return (
    <section className={`${adminGlass} flex h-full flex-col p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Platform pulse</h2>
        <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
          {loading ? "Loading…" : pulse?.dateLabel ?? "—"}
        </span>
      </div>

      <p className="mt-1 text-xs text-white/40">
        {isToday ? "Today" : DAYS[selectedDay]} · bets, wins & sessions from audit DB
      </p>

      <div className="mt-5 flex flex-1 flex-col justify-center gap-5">
        {bars.map((b) => {
          const pct = Math.min(100, Math.round((b.value / b.max) * 100));
          return (
            <div key={b.label}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/50">{b.label}</span>
                <span className="font-semibold tabular-nums text-white">{b.display}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${b.color} transition-all duration-500`}
                  style={{ width: `${loading ? 8 : Math.max(pct, b.value > 0 ? 6 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
        <div className="rounded-xl bg-white/[0.03] px-2 py-2">
          <div className="font-bold text-white">{pulse?.labels.winVolume ?? "—"}</div>
          <div className="text-white/35">Win volume</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-2 py-2">
          <div className="font-bold text-white">{pulse?.labels.sessions ?? "—"}</div>
          <div className="text-white/35">Game opens</div>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/35">
            This week
          </div>
          <Link
            to="/admin/audit"
            className="text-[11px] font-semibold text-violet-300 hover:text-violet-200"
          >
            Open audit
          </Link>
        </div>
        <div className="flex justify-between gap-1" role="tablist" aria-label="Select day">
          {DAYS.map((d, i) => {
            const active = i === selectedDay;
            const isFuture = i > todayIndex();
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={isFuture}
                title={isFuture ? "Future day" : d}
                onClick={() => onSelectDay(i)}
                className={`flex h-9 flex-1 items-center justify-center rounded-lg text-[10px] font-semibold transition ${
                  active
                    ? "bg-violet-500/40 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,0.45)]"
                    : isFuture
                      ? "cursor-not-allowed bg-white/[0.02] text-white/20"
                      : "bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {d[0]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
