import { createFileRoute } from "@tanstack/react-router";
import { PromoCarousel } from "@/components/maxhigh/PromoCarousel";
import { CategoryTabs } from "@/components/maxhigh/CategoryTabs";
import { GameModeGrid } from "@/components/maxhigh/GameModeGrid";
import { OriginalsRow } from "@/components/maxhigh/OriginalsRow";
import { StatsBar } from "@/components/maxhigh/StatsBar";
import { Leaderboard } from "@/components/maxhigh/Leaderboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaxHigh — Casino Dashboard" },
      { name: "description", content: "MaxHigh dashboard: slots, mines, crash, dice, tower, wheel and daily/weekly races." },
      { property: "og:title", content: "MaxHigh — Casino Dashboard" },
      { property: "og:description", content: "Play originals and slots. Join daily and weekly races on MaxHigh." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <PromoCarousel />
      <StatsBar />
      <CategoryTabs />
      <GameModeGrid />
      <OriginalsRow />
      <Leaderboard />
    </>
  );
}
