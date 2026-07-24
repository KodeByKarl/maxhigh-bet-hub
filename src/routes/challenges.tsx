import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { PageHeader, ComingSoonPanel } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — MaxHigh" },
      { name: "description", content: "Complete daily challenges to earn bonuses on MaxHigh." },
      { property: "og:title", content: "Challenges — MaxHigh" },
      { property: "og:description", content: "Complete daily challenges to earn bonuses on MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Challenges" description="Complete tasks and stack bonus rewards." icon={Target} accent="#DC2626" />
      <ComingSoonPanel label="Daily challenges" />
    </>
  ),
});
