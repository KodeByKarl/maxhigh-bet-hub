import { Dice5, Bomb, TrendingUp, Dices, Building2, Disc3, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tile = { label: string; icon: LucideIcon; color: string };

const tiles: Tile[] = [
  { label: "Slots", icon: Dice5, color: "#7C3AED" },
  { label: "Mines", icon: Bomb, color: "#1E3A8A" },
  { label: "Crash", icon: TrendingUp, color: "#0E7490" },
  { label: "Dice", icon: Dices, color: "#B45309" },
  { label: "Tower", icon: Building2, color: "#4C1D95" },
  { label: "Wheel", icon: Disc3, color: "#7C2D12" },
];

export function GameModeGrid() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Quick Games</h2>
        <div className="flex items-center gap-2">
          <button className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
            View All
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover">
            <ChevronLeft size={16} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <button
            key={t.label}
            style={{ backgroundColor: t.color }}
            className="group flex aspect-square flex-col items-center justify-between rounded-2xl p-4 text-white transition-transform hover:-translate-y-0.5"
          >
            <div className="grid flex-1 place-items-center">
              <t.icon size={44} strokeWidth={1.75} />
            </div>
            <span className="text-sm font-black uppercase tracking-wider">{t.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
