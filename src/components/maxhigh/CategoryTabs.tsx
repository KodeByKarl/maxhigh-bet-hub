import { Search } from "lucide-react";

const tabs = ["Lobby", "Originals", "MaxHigh Picks", "Slots", "Latest Releases"];

export function CategoryTabs() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-panel px-4 text-muted-foreground sm:w-64">
        <Search size={16} />
        <input
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Search"
        />
      </div>
    </div>
  );
}
