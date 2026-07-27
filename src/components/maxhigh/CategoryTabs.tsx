import { slotGames, type GameCategory, type SlotGame } from "@/lib/games";
import { useTranslation } from "@/lib/i18n";

export type LobbyTab = "lobby" | "slot" | "cards" | "fishing" | "latest";

const tabs: { id: LobbyTab; label: string }[] = [
  { id: "lobby", label: "Lobby" },
  { id: "slot", label: "Slots" },
  { id: "cards", label: "Cards" },
  { id: "fishing", label: "Fishing" },
  { id: "latest", label: "Latest Releases" },
];

type Props = {
  value: LobbyTab;
  onChange: (tab: LobbyTab) => void;
};

export function CategoryTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Game categories">
      {tabs.map((tabItem) => {
        const active = tabItem.id === value;
        return (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tabItem.id)}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-muted text-foreground/80 hover:bg-panel-hover",
            ].join(" ")}
          >
            {t(tabItem.label)}
          </button>
        );
      })}
    </div>
  );
}

export function gamesForTab(
  tab: LobbyTab,
  catalog: SlotGame[] = slotGames,
): { title: string; games: SlotGame[] } {
  if (tab === "lobby") {
    return { title: "Popular Games", games: catalog };
  }
  if (tab === "latest") {
    return {
      title: "Latest Releases",
      games: catalog.filter((g) => g.tag === "New" || g.tag === "Hot"),
    };
  }
  const labels: Record<GameCategory, string> = {
    slot: "Slots",
    cards: "Cards",
    fishing: "Fishing",
  };
  return {
    title: labels[tab],
    games: catalog.filter((g) => g.category === tab),
  };
}
