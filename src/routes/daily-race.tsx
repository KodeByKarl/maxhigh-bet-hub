import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { PageHeader, ComingSoonPanel } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/daily-race")({
  head: () => ({
    meta: [
      { title: "Daily Race — MaxHigh" },
      { name: "description", content: "Compete in the MaxHigh daily race." },
      { property: "og:title", content: "Daily Race — MaxHigh" },
      { property: "og:description", content: "Compete in the MaxHigh daily race." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Daily Race" description="Prize pool · Resets at midnight UTC · Coming soon." icon={Timer} accent="#C6FF3D" />
      <ComingSoonPanel label="Daily race standings" />
    </>
  ),
});
