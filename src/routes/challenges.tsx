import { createFileRoute } from "@tanstack/react-router";
import { Target, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

const challenges = [
  { title: "Win 5 in a row on Dice", reward: "$25", done: true },
  { title: "Hit 10x multiplier on Crash", reward: "$50", done: true },
  { title: "Play 100 Slots spins", reward: "$15", done: false },
  { title: "Reach floor 8 on Tower", reward: "$40", done: false },
  { title: "Wager $500 across Originals", reward: "$75", done: false },
  { title: "Land a jackpot on Wheel", reward: "$200", done: false },
];

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
      <div className="grid gap-3 md:grid-cols-2">
        {challenges.map((c) => (
          <div key={c.title} className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-4">
            {c.done
              ? <CheckCircle2 size={22} className="shrink-0 text-lime" />
              : <Circle size={22} className="shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-foreground">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.done ? "Completed" : "In progress"}</div>
            </div>
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-[#0A0912]">{c.reward}</span>
          </div>
        ))}
      </div>
    </>
  ),
});
