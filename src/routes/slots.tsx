import { createFileRoute } from "@tanstack/react-router";
import { Dice5 } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { GameModeGrid } from "@/components/maxhigh/GameModeGrid";

export const Route = createFileRoute("/slots")({
  head: () => ({
    meta: [
      { title: "Slots — MaxHigh" },
      { name: "description", content: "Thousands of slot titles from the world's top studios." },
      { property: "og:title", content: "Slots — MaxHigh" },
      { property: "og:description", content: "Thousands of slot titles from the world's top studios." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Slots" description="Reels, bonus rounds and jackpots — thousands of titles." icon={Dice5} accent="#A21CAF" />
      <GameModeGrid />
      <GameModeGrid />
    </>
  ),
});
