import { createFileRoute } from "@tanstack/react-router";
import { Layers2 } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Cards — MaxHigh" },
      { name: "description", content: "MaxHigh card games with custom thumbnails." },
      { property: "og:title", content: "Cards — MaxHigh" },
      { property: "og:description", content: "MaxHigh card games with custom thumbnails." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Cards" description="Poker, blackjack and royal deals — real card tables." icon={Layers2} accent="#7C3AED" />
      <SlotGameGrid title="Cards" category="cards" />
    </>
  ),
});
