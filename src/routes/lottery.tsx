import { createFileRoute } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/lottery")({
  head: () => ({
    meta: [
      { title: "Lottery — MaxHigh" },
      { name: "description", content: "Buy tickets and win the MaxHigh weekly lottery." },
      { property: "og:title", content: "Lottery — MaxHigh" },
      { property: "og:description", content: "Buy tickets and win the MaxHigh weekly lottery." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Lottery" description="Weekly draw · Grab your ticket before the countdown." icon={Ticket} accent="#7C3AED" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-lime bg-panel p-6 md:col-span-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-lime">Current Jackpot</div>
          <div className="mt-2 text-4xl font-black tabular-nums text-foreground">$124,590</div>
          <div className="mt-2 text-sm text-muted-foreground">Draw in 30h 12m · 4,218 tickets sold</div>
          <button className="mt-5 h-11 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-[#6D28D9]">
            Buy ticket · $1.00
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your tickets</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-foreground">12</div>
          <div className="mt-1 text-xs text-muted-foreground">Odds 1 in 351</div>
        </div>
      </div>
    </>
  ),
});
