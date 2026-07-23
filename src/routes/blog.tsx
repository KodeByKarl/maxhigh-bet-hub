import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

const posts = [
  { title: "Winning strategies for Crash", tag: "Guide", date: "Jul 12" },
  { title: "How our provably fair system works", tag: "Tech", date: "Jul 08" },
  { title: "Meet last week's biggest winner", tag: "Community", date: "Jul 03" },
  { title: "New Originals: Hilo and Limbo", tag: "Update", date: "Jun 28" },
];

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
      <div className="grid gap-3 md:grid-cols-2">
        {posts.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-panel p-5 hover:bg-panel-hover">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">{p.tag}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">{p.date}</span>
            </div>
            <div className="mt-3 text-lg font-black text-foreground">{p.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">A quick read on {p.title.toLowerCase()} — practical tips and takeaways.</p>
          </div>
        ))}
      </div>
    </>
  ),
});
