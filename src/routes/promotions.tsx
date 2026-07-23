import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { PromoCarousel } from "@/components/maxhigh/PromoCarousel";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions — MaxHigh" },
      { name: "description", content: "All active promotions, bonuses and drops on MaxHigh." },
      { property: "og:title", content: "Promotions — MaxHigh" },
      { property: "og:description", content: "All active promotions, bonuses and drops on MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="All Promotions" description="Bonuses, drops and races — everything live right now." icon={Megaphone} accent="#0E7490" />
      <PromoCarousel />
      <PromoCarousel />
    </>
  ),
});
