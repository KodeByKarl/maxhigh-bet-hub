import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getAdminDayPulseFn } from "@/functions/admin";
import type { AdminDayPulse } from "@/lib/admin-types";
import { adminGlass } from "../ui/glass";
import { BarChart2, ExternalLink } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function todayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

interface PulseBar {
  label: string;
  value: number;
  display: string;
  color: string;
  bgColor: string;
  pct: number;
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
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnimate(false);
    (async () => {
      try {
        const data = await getAdminDayPulseFn({ data: { dayIndex: selectedDay } });
        if (!cancelled) {
          setPulse(data);
          // Trigger bar animation after data loads
          setTimeout(() => { if (!cancelled) setAnimate(true); }, 80);
        }
      } catch {
        if (!cancelled) setPulse(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDay]);

  const allVals = [
    pulse?.bets ?? 0,
    pulse?.wins ?? 0,
    pulse?.betVolume ?? 0,
    pulse?.playersActive ?? 0,
  ];
  const globalMax = Math.max(1, ...allVals);

  const bars: PulseBar[] = [
    {
      label: "Bets / Losses",
      value: pulse?.bets ?? 0,
      display: pulse?.labels.bets ?? "—",
      color: "bg-rose-500",
      bgColor: "rgba(244,63,94,0.10)",
      pct: Math.min(100, Math.round(((pulse?.bets ?? 0) / globalMax) * 100)),
    },
    {
      label: "Player Wins",
      value: pulse?.wins ?? 0,
      display: pulse?.labels.wins ?? "—",
      color: "bg-emerald-500",
      bgColor: "rgba(16,185,129,0.10)",
      pct: Math.min(100, Math.round(((pulse?.wins ?? 0) / globalMax) * 100)),
    },
    {
      label: "Bet Volume",
      value: pulse?.betVolume ?? 0,
      display: pulse?.labels.betVolume ?? "—",
      color: "bg-violet-500",
      bgColor: "rgba(139,92,246,0.10)",
      pct: Math.min(100, Math.round(((pulse?.betVolume ?? 0) / globalMax) * 100)),
    },
    {
      label: "Active Players",
      value: pulse?.playersActive ?? 0,
      display: pulse?.labels.playersActive ?? "—",
      color: "bg-cyan-500",
      bgColor: "rgba(34,211,238,0.10)",
      pct: Math.min(100, Math.round(((pulse?.playersActive ?? 0) / globalMax) * 100)),
    },
  ];

  const isToday = selectedDay === todayIndex();

  return (
    <section className={`${adminGlass} flex h-full flex-col overflow-hidden p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 border border-violet-400/20">
            <BarChart2 size={15} className="text-violet-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">Platform Pulse</h2>
            <p className="text-[10px] text-white/35 mt-0.5">
              {isToday ? "Live today" : DAYS[selectedDay]} · audit data
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/50">
          {loading ? "Loading…" : pulse?.dateLabel ?? "—"}
        </span>
      </div>

      {/* Bars */}
      <div className="mt-5 flex flex-1 flex-col justify-center gap-4">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/45">{b.label}</span>
              <span className="text-[11px] font-bold tabular-nums text-white">{b.display}</span>
            </div>
            {/* Track */}
            <div className="h-3 overflow-hidden rounded-full" style={{ background: b.bgColor }}>
              <div
                className={`h-full rounded-full ${b.color} transition-all duration-700 ease-out`}
                style={{
                  width: `${animate && !loading ? Math.max(b.pct, b.value > 0 ? 5 : 0) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mini summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Win Vol.", value: pulse?.labels.winVolume ?? "—" },
          { label: "Sessions", value: pulse?.labels.sessions ?? "—" },
          {
            label: "Net",
            value:
              pulse
                ? `₱${Math.max(0, pulse.betVolume - pulse.winVolume).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2.5 text-center">
            <div className="text-sm font-black text-white tabular-nums">{value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Day Selector */}
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            This Week
          </span>
          <Link
            to="/admin/audit"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
          >
            Audit log
            <ExternalLink size={10} />
          </Link>
        </div>

        {/* Segmented control */}
        <div
          className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1"
          role="tablist"
          aria-label="Select day"
        >
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
                className={`relative flex h-8 flex-1 items-center justify-center rounded-lg text-[10px] font-bold transition-all duration-200 ${
                  active
                    ? "bg-violet-600 text-white"
                    : isFuture
                      ? "cursor-not-allowed text-white/15"
                      : "text-white/40 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {d[0]}
                {i === todayIndex() && !active && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
