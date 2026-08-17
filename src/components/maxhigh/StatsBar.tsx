import { useEffect, useState } from "react";
import { Trophy, Flame, Users, Coins } from "lucide-react";
import { getPlatformStatsFn } from "@/functions/api";
import { useTranslation } from "@/lib/i18n";

type StatCard = {
  label: string;
  value: string;
  icon: typeof Coins;
  color: string;
};

export function StatsBar() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<StatCard[]>([
    { label: "Total Bets", value: "…", icon: Coins, color: "#7C3AED" },
    { label: "Players Online", value: "…", icon: Users, color: "#0E7490" },
    { label: "Biggest Win 24h", value: "…", icon: Trophy, color: "#EAB308" },
    { label: "Hot Streak", value: "…", icon: Flame, color: "#DC2626" },
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const s = await getPlatformStatsFn();
        if (cancelled) return;
        setCards([
          { label: "Total Bets", value: s.totalBetsLabel, icon: Coins, color: "#7C3AED" },
          { label: "Players Online", value: s.playersOnlineLabel, icon: Users, color: "#0E7490" },
          { label: "Biggest Win 24h", value: s.biggestWin24hLabel, icon: Trophy, color: "#EAB308" },
          { label: "Hot Streak", value: s.hotStreakLabel, icon: Flame, color: "#DC2626" },
        ]);
      } catch {
        if (!cancelled) {
          setCards([
            { label: "Total Bets", value: "—", icon: Coins, color: "#7C3AED" },
            { label: "Players Online", value: "—", icon: Users, color: "#0E7490" },
            { label: "Biggest Win 24h", value: "—", icon: Trophy, color: "#EAB308" },
            { label: "Hot Streak", value: "—", icon: Flame, color: "#DC2626" },
          ]);
        }
      }
    };

    void load();
    const id = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((s) => (
        <div key={s.label} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-panel p-3 sm:gap-3 sm:p-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: s.color }}
          >
            <s.icon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t(s.label)}
            </div>
            <div className="mt-0.5 truncate text-lg font-black tabular-nums text-foreground">
              {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
