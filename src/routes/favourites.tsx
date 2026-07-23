import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageHeader, ComingSoonPanel } from "@/components/maxhigh/PageHeader";
import { OriginalsRow } from "@/components/maxhigh/OriginalsRow";

export const Route = createFileRoute("/favourites")({
  head: () => ({
    meta: [
      { title: "Favourites — MaxHigh" },
      { name: "description", content: "Your saved games and quick access on MaxHigh." },
      { property: "og:title", content: "Favourites — MaxHigh" },
      { property: "og:description", content: "Your saved games and quick access on MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Favourites" description="Your saved games — one tap to play." icon={Star} accent="#EAB308" />
      <OriginalsRow />
      <ComingSoonPanel label="Sync your favourites across devices" />
    </>
  ),
});
