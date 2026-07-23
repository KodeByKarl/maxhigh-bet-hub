import { Dices, Hash, Bomb, Disc3, ArrowUpDown, Infinity as Inf, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Card = { label: string; icon: LucideIcon; color: string };

const cards: Card[] = [
  { label: "Dice", icon: Dices, color: "#7C3AED" },
  { label: "Keno", icon: Hash, color: "#EA580C" },
  { label: "Mines", icon: Bomb, color: "#1E3A8A" },
  { label: "Wheel", icon: Disc3, color: "#A21CAF" },
  { label: "Hilo", icon: ArrowUpDown, color: "#EAB308" },
  { label: "Limbo", icon: Inf, color: "#DC2626" },
];

export function OriginalsRow() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-foreground">Originals</h2>
      </div>
      <div className="grid grid-flow-col auto-cols-[45%] gap-3 overflow-x-auto no-scrollbar sm:auto-cols-[30%] md:grid-flow-row md:auto-cols-auto md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const isYellow = c.color === "#EAB308";
          const textColor = isYellow ? "#0A0912" : "#FFFFFF";
          return (
            <button
              key={c.label}
              style={{ backgroundColor: c.color, color: textColor }}
              className="group flex aspect-[3/4] flex-col justify-between rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
            >
              <c.icon size={36} strokeWidth={2} />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">MaxHigh</div>
                <div className="text-xl font-black uppercase tracking-wide">{c.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
