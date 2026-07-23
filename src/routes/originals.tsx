import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";
import { OriginalsRow } from "@/components/maxhigh/OriginalsRow";

export const Route = createFileRoute("/originals")({
  head: () => ({
    meta: [
      { title: "Originals — MaxHigh" },
      { name: "description", content: "MaxHigh Originals: Dice, Mines, Crash, Wheel, Hilo, Limbo and more." },
      { property: "og:title", content: "Originals — MaxHigh" },
      { property: "og:description", content: "MaxHigh Originals: Dice, Mines, Crash, Wheel, Hilo, Limbo and more." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Originals" description="Provably fair games built in-house." icon={Sparkles} accent="#7C3AED" />
      <OriginalsRow />
      <OriginalsRow />
    </>
  ),
});
