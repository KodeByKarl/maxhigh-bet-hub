import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { Leaderboard } from "@/components/maxhigh/Leaderboard";

export const Route = createFileRoute("/weekly-race")({
  head: () => ({
    meta: [
      { title: "Weekly Race — MaxHigh" },
      { name: "description", content: "Compete in the MaxHigh $50,000 weekly race." },
      { property: "og:title", content: "Weekly Race — MaxHigh" },
      { property: "og:description", content: "Compete in the MaxHigh $50,000 weekly race." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Weekly Race" description="$50,000 prize pot · Wager more, climb higher." icon={Trophy} accent="#7C3AED" />
      <Leaderboard />
    </>
  ),
});
