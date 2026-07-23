import { createFileRoute } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

const tiers = [
  { name: "Bronze", color: "#B45309", req: "$0" },
  { name: "Silver", color: "#8B85A8", req: "$1,000" },
  { name: "Gold", color: "#EAB308", req: "$10,000" },
  { name: "Platinum", color: "#0E7490", req: "$50,000" },
  { name: "Diamond", color: "#A21CAF", req: "$250,000" },
  { name: "Obsidian", color: "#4C1D95", req: "$1,000,000" },
];

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "VIP — MaxHigh" },
      { name: "description", content: "Unlock exclusive rewards with the MaxHigh VIP program." },
      { property: "og:title", content: "VIP — MaxHigh" },
      { property: "og:description", content: "Unlock exclusive rewards with the MaxHigh VIP program." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="VIP Program" description="Six tiers · Rakeback, exclusive drops and dedicated host." icon={Crown} accent="#EAB308" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className="rounded-2xl border border-border bg-panel p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ backgroundColor: t.color }}>
              <Crown size={22} className="text-white" />
            </div>
            <div className="mt-3 text-lg font-black uppercase tracking-wide text-foreground">{t.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Wager required</div>
            <div className="text-sm font-bold tabular-nums text-foreground">{t.req}</div>
          </div>
        ))}
      </div>
    </>
  ),
});
