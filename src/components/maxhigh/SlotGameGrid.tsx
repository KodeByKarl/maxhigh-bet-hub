import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { type SlotGame } from "@/lib/games";
import { useCatalogGames } from "@/lib/useCatalogGames";
import { GameModal } from "./GameModal";

type Props = {
  title?: string;
  games?: SlotGame[];
  limit?: number;
  /** When true (default if games omitted), filter by Superadmin-enabled catalog */
  useCatalog?: boolean;
  category?: SlotGame["category"];
};

export function SlotGameGrid({ title = "Slots", games, limit, useCatalog = !games, category }: Props) {
  const { t } = useTranslation();
  const { games: catalog } = useCatalogGames();
  const source = games ?? (useCatalog ? catalog : catalog);
  const filtered = category ? source.filter((g) => g.category === category) : source;
  const list = typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  const [selected, setSelected] = useState<SlotGame | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t(title)}</h2>
        <div className="flex items-center gap-2">
          <button className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
            {t("View All")}
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover">
            <ChevronLeft size={16} />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => setSelected(game)}
            className="group relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-border bg-panel text-left transition-transform hover:-translate-y-0.5"
          >
            <img
              src={game.thumb}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {game.tag && (
              <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-0.5 text-[10px] font-black uppercase text-on-lime">
                {game.tag}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <div className="truncate text-xs font-bold uppercase tracking-wide text-white">{game.name}</div>
            </div>
          </button>
        ))}
      </div>

      <GameModal game={selected} open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
