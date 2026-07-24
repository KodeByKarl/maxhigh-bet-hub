import { createFileRoute } from "@tanstack/react-router";
import { Dice5 } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";

export const Route = createFileRoute("/slots")({
  head: () => ({
    meta: [
      { title: "Slots — MaxHigh" },
      { name: "description", content: "MaxHigh slot games with custom thumbnails." },
      { property: "og:title", content: "Slots — MaxHigh" },
      { property: "og:description", content: "MaxHigh slot games with custom thumbnails." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Slots" description="Reels, bonus rounds and jackpots." icon={Dice5} accent="#A21CAF" />
      <SlotGameGrid title="Slots" category="slot" />
    </>
  ),
});
