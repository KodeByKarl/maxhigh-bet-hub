import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/maxhigh/Navbar";
import { Sidebar } from "@/components/maxhigh/Sidebar";
import { PromoCarousel } from "@/components/maxhigh/PromoCarousel";
import { CategoryTabs } from "@/components/maxhigh/CategoryTabs";
import { GameModeGrid } from "@/components/maxhigh/GameModeGrid";
import { OriginalsRow } from "@/components/maxhigh/OriginalsRow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaxHigh — Casino Dashboard" },
      { name: "description", content: "MaxHigh dashboard: slots, mines, crash, dice, tower, wheel and daily/weekly races." },
      { property: "og:title", content: "MaxHigh — Casino Dashboard" },
      { property: "og:description", content: "Play originals and slots. Join daily and weekly races on MaxHigh." },
    ],
  }),
  component: Index,
});

function Index() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-8 p-4 sm:p-6">
            <PromoCarousel />
            <CategoryTabs />
            <GameModeGrid />
            <OriginalsRow />
          </div>
        </main>
      </div>
    </div>
  );
}
