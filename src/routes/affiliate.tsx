import { createFileRoute } from "@tanstack/react-router";
import { Users, Copy } from "lucide-react";
import { PageHeader } from "@/components/maxhigh/PageHeader";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate — MaxHigh" },
      { name: "description", content: "Earn commission by referring players to MaxHigh." },
      { property: "og:title", content: "Affiliate — MaxHigh" },
      { property: "og:description", content: "Earn commission by referring players to MaxHigh." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Affiliate Program" description="Earn up to 45% commission on every referral." icon={Users} accent="#7C3AED" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-panel p-5 md:col-span-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your referral link</div>
          <div className="mt-2 flex items-center gap-2 rounded-full bg-[#221E3A] px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">https://maxhigh.gg/r/MH-8F42QK</span>
            <button className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-[#6D28D9]">
              <Copy size={14} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Clicks", v: "12,481" },
              { l: "Signups", v: "842" },
              { l: "Earned", v: "$3,192" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-[#221E3A] p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.l}</div>
                <div className="mt-1 text-lg font-black tabular-nums text-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-lime bg-panel p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-lime">Commission Rate</div>
          <div className="mt-2 text-4xl font-black tabular-nums text-foreground">45%</div>
          <div className="mt-1 text-xs text-muted-foreground">Lifetime revenue share on every player.</div>
        </div>
      </div>
    </>
  ),
});
