import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useAccessStatus } from "@/lib/useAccessStatus";
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

export function SlotGameGrid({
  title = "Slots",
  games,
  limit,
  useCatalog = !games,
  category,
}: Props) {
  const { t } = useTranslation();
  const { games: catalog } = useCatalogGames();
  const source = games ?? (useCatalog ? catalog : catalog);
  const access = useAccessStatus();
  // Locked games are hidden from the lobby entirely (the server still enforces the lock on every wager).
  const visible = source.filter((g) => !access.isLocked(g.id));
  const filtered = category ? visible.filter((g) => g.category === category) : visible;
  const list = typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  const [selected, setSelected] = useState<SlotGame | null>(null);

  return (
    <section className="game-catalog-section flex flex-col gap-4">
      <div className="flex items-center justify-center sm:justify-between">
        <h2 className="text-center text-lg font-bold text-foreground sm:text-left">{t(title)}</h2>
      </div>
      <div className="game-card-grid">
        {list.map((game, index) => (
          <button
            key={game.id}
            type="button"
            aria-label={access.isLocked(game.id) ? `${game.name} (locked)` : `Play ${game.name}`}
            onClick={() => setSelected(game)}
            className="game-card group relative aspect-square min-w-0 overflow-hidden rounded-xl border border-border bg-panel text-left shadow-[0_8px_24px_rgba(9,4,24,0.24)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_14px_30px_rgba(9,4,24,0.42)] active:scale-[0.97] sm:rounded-2xl"
          >
            <img
              src={game.thumb}
              alt=""
              loading={index < 6 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index < 4 ? "high" : "auto"}
              sizes="(max-width: 479px) calc(50vw - 1rem), (max-width: 767px) 31vw, (max-width: 1199px) 23vw, 15rem"
              className={`h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]${access.isLocked(game.id) ? " opacity-50 grayscale" : ""}`}
            />
            {access.isLocked(game.id) && (
              <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-sm sm:text-[11px]">
                <Lock size={12} aria-hidden /> Locked
              </span>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.04]" />
            {game.tag && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-lime px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-on-lime shadow-md sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]">
                {game.tag}
              </span>
            )}
          </button>
        ))}
      </div>

      <GameModal
        game={selected}
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </section>
  );
}
