import { Search } from "lucide-react";

const tabs = ["Lobby", "Originals", "MaxHigh Picks", "Slots", "Latest Releases"];

export function CategoryTabs() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((t, i) => (
        <button
          key={t}
          className={[
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            i === 0
              ? "bg-primary text-primary-foreground"
              : "bg-panel text-foreground/80 hover:bg-panel-hover",
          ].join(" ")}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// keep the unused Search import silenced during future edits
void Search;
