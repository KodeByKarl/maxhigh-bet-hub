import { createFileRoute } from "@tanstack/react-router";
import { Fish } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";

export const Route = createFileRoute("/fishing")({
  head: () => ({
    meta: [
      { title: "Fishing — MaxHigh" },
      { name: "description", content: "MaxHigh fishing games with custom thumbnails." },
      { property: "og:title", content: "Fishing — MaxHigh" },
      { property: "og:description", content: "MaxHigh fishing games with custom thumbnails." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Fishing" description="Arcade fishing — reel in the big catch." icon={Fish} accent="#0E7490" />
      <SlotGameGrid title="Fishing" category="fishing" />
    </>
  ),
});
