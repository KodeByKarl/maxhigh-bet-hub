import { createFileRoute } from "@tanstack/react-router";
import { Headphones, MessageCircle, Mail, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Live Support — MaxHigh" },
      { name: "description", content: "Get help from the MaxHigh support team, 24/7." },
      { property: "og:title", content: "Live Support — MaxHigh" },
      { property: "og:description", content: "Get help from the MaxHigh support team, 24/7." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Live Support" description="We're online 24/7 — average response 2 minutes." icon={Headphones} accent="#0E7490" />
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: MessageCircle, label: "Live Chat", note: "Fastest way to reach us", color: "#7C3AED" },
          { icon: Mail, label: "Email", note: "support@maxhigh.gg", color: "#0E7490" },
          { icon: LifeBuoy, label: "Help Center", note: "Guides & FAQ", color: "#EAB308" },
        ].map((o) => (
          <button key={o.label} className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-5 text-left hover:bg-panel-hover">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: o.color }}>
              <o.icon size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wide text-foreground">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.note}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  ),
});
