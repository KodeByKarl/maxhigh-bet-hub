import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, MoreHorizontal, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { REPORT_SECTIONS, type ReportSection } from "../reports/ReportNav";
import { SUPER_MOBILE_TABS, SUPER_MORE_NAV } from "./nav";

export function SuperMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onReports = pathname.startsWith("/superadmin/reports");
  const activeView = onReports
    ? (pathname.split("/").pop() as ReportSection | undefined)
    : undefined;
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(onReports);

  useEffect(() => {
    if (onReports) setReportsOpen(true);
  }, [onReports]);

  const moreActive =
    moreOpen ||
    SUPER_MORE_NAV.some((item) =>
      item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
    );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-500/20 bg-[#1A162B]/95 px-1.5 pb-[max(3.25rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {SUPER_MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.to
              : item.to.includes("$view")
                ? onReports
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                params={item.params as { view: "winlose" } | undefined}
                activeOptions={{ exact: Boolean(item.exact) }}
                className={[
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold tracking-wide",
                  active ? "bg-amber-500 text-black" : "text-muted-foreground",
                ].join(" ")}
              >
                <Icon size={18} />
                {item.shortLabel}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={[
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold tracking-wide",
              moreActive ? "bg-amber-500/20 text-amber-200" : "text-muted-foreground",
            ].join(" ")}
          >
            <MoreHorizontal size={18} />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-amber-500/20 bg-[#1A162B] p-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-foreground"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-black">
                <Shield size={15} />
              </span>
              MaxHigh Superadmin
            </SheetTitle>
            <SheetDescription>Jump to the rest of the control panel.</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-2">
            {SUPER_MORE_NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={[
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-sm font-semibold",
                    active
                      ? "border-amber-500/40 bg-amber-500 text-black"
                      : "border-white/10 bg-white/[0.04] text-foreground",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  {item.shortLabel}
                </Link>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setReportsOpen((o) => !o)}
              className={[
                "flex w-full items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold",
                onReports
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-foreground",
              ].join(" ")}
            >
              <span className="flex-1 text-left">Report sections</span>
              <ChevronDown size={16} className={reportsOpen ? "rotate-180" : ""} />
            </button>
            {reportsOpen && (
              <div className="mt-2 grid gap-1.5">
                {REPORT_SECTIONS.map((item) => {
                  const active = onReports && activeView === item.slug;
                  return (
                    <Link
                      key={item.slug}
                      to="/superadmin/reports/$view"
                      params={{ view: item.slug }}
                      onClick={() => setMoreOpen(false)}
                      className={[
                        "rounded-xl px-3 py-2.5 text-sm font-medium",
                        active ? "bg-amber-500 text-black" : "bg-white/[0.04] text-muted-foreground",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
