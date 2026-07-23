import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { Leaderboard } from "@/components/maxhigh/Leaderboard";

export const Route = createFileRoute("/daily-race")({
  head: () => ({
    meta: [
      { title: "Daily Race — MaxHigh" },
      { name: "description", content: "Race for the $5,000 daily prize pool on MaxHigh." },
      { property: "og:title", content: "Daily Race — MaxHigh" },
      { property: "og:description", content: "Race for the $5,000 daily prize pool on MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Daily Race" description="$5,000 prize pool · Resets at midnight UTC." icon={Timer} accent="#C6FF3D" />
      <Leaderboard />
    </>
  ),
});
