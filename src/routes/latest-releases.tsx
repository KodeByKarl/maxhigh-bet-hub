import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { GameModeGrid } from "@/components/maxhigh/GameModeGrid";
import { OriginalsRow } from "@/components/maxhigh/OriginalsRow";

export const Route = createFileRoute("/latest-releases")({
  head: () => ({
    meta: [
      { title: "Latest Releases — MaxHigh" },
      { name: "description", content: "New slots and originals just added to MaxHigh." },
      { property: "og:title", content: "Latest Releases — MaxHigh" },
      { property: "og:description", content: "New slots and originals just added to MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Latest Releases" description="Fresh drops — brand new games this week." icon={Zap} accent="#C6FF3D" />
      <GameModeGrid />
      <OriginalsRow />
    </>
  ),
});
