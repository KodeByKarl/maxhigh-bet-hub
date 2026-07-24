import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";

export const Route = createFileRoute("/latest-releases")({
  head: () => ({
    meta: [
      { title: "Latest Releases — MaxHigh" },
      { name: "description", content: "New MaxHigh slots just added." },
      { property: "og:title", content: "Latest Releases — MaxHigh" },
      { property: "og:description", content: "New MaxHigh slots just added." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Latest Releases" description="Fresh drops — brand new games this week." icon={Zap} accent="#C6FF3D" />
      <SlotGameGrid title="New Slots" />
    </>
  ),
});
