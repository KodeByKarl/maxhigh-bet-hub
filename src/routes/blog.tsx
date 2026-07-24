import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader, ComingSoonPanel } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — MaxHigh" },
      { name: "description", content: "News, guides and updates from the MaxHigh team." },
      { property: "og:title", content: "Blog — MaxHigh" },
      { property: "og:description", content: "News, guides and updates from the MaxHigh team." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Blog" description="News, strategy guides and product updates." icon={FileText} accent="#0E7490" />
      <ComingSoonPanel label="Blog posts" />
    </>
  ),
});
