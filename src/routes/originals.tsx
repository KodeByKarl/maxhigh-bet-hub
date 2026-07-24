import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { SlotGameGrid } from "@/components/maxhigh/SlotGameGrid";

export const Route = createFileRoute("/originals")({
  head: () => ({
    meta: [
      { title: "Originals — MaxHigh" },
      { name: "description", content: "MaxHigh original slot titles with custom artwork." },
      { property: "og:title", content: "Originals — MaxHigh" },
      { property: "og:description", content: "MaxHigh original slot titles with custom artwork." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Originals" description="Our in-house titles with custom thumbnails." icon={Sparkles} accent="#7C3AED" />
      <SlotGameGrid title="MaxHigh Originals" />
    </>
  ),
});
