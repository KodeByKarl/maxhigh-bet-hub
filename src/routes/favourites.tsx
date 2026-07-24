import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";
import type { SlotGame } from "@/lib/games";

/** Empty until favourites are loaded from the backend. */
const favouriteGames: SlotGame[] = [];

export const Route = createFileRoute("/favourites")({
  head: () => ({
    meta: [
      { title: "Favourites — MaxHigh" },
      { name: "description", content: "Your saved MaxHigh games and quick access." },
      { property: "og:title", content: "Favourites — MaxHigh" },
      { property: "og:description", content: "Your saved MaxHigh games and quick access." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Favourites" description="Your saved games — one tap to play." icon={Star} accent="#EAB308" />
      {favouriteGames.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
          No favourites yet. Star games to see them here.
        </div>
      ) : (
        <SlotGameGrid title="Saved Games" games={favouriteGames} />
      )}
    </>
  ),
});
