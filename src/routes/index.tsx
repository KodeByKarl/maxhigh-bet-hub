import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PromoCarousel } from "@/components/maxhigh/PromoCarousel";
import { CategoryTabs, gamesForTab, type LobbyTab } from "@/components/maxhigh/CategoryTabs";
import { StatsBar } from "@/components/maxhigh/StatsBar";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";
import { useCatalogGames } from "@/lib/useCatalogGames";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaxHigh — Casino Dashboard" },
      { name: "description", content: "MaxHigh casino dashboard — play featured slots with daily and weekly races." },
      { property: "og:title", content: "MaxHigh — Casino Dashboard" },
      { property: "og:description", content: "Play featured MaxHigh slots. Join daily and weekly races." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<LobbyTab>("lobby");
  const { games: catalog } = useCatalogGames();
  const { title, games } = gamesForTab(tab, catalog);

  return (
    <>
      <PromoCarousel />
      <StatsBar />
      <CategoryTabs value={tab} onChange={setTab} />
      <SlotGameGrid title={title} games={games} />
    </>
  );
}
