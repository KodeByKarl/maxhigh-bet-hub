import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { PageHeader, ComingSoonPanel } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/weekly-race")({
  head: () => ({
    meta: [
      { title: "Weekly Race — MaxHigh" },
      { name: "description", content: "Compete in the MaxHigh weekly race." },
      { property: "og:title", content: "Weekly Race — MaxHigh" },
      { property: "og:description", content: "Compete in the MaxHigh weekly race." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Weekly Race" description="Wager more, climb higher · Coming soon." icon={Trophy} accent="#7C3AED" />
      <ComingSoonPanel label="Weekly race standings" />
    </>
  ),
});
