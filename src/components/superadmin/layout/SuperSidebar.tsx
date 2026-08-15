import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, ChevronDown, BarChart3, ScrollText } from "lucide-react";
import { saGlass } from "../ui/glass";
import { REPORT_SECTIONS, type ReportSection } from "../reports/ReportNav";
import { SUPER_NAV } from "./nav";

const topNav = SUPER_NAV.filter((item) => item.to !== "/superadmin/staff");

const navLinkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground data-[status=active]:bg-gradient-to-r data-[status=active]:from-amber-500 data-[status=active]:to-orange-500 data-[status=active]:text-black data-[status=active]:shadow-[0_0_20px_rgba(245,158,11,0.25)]";

export function SuperSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onReports = pathname.startsWith("/superadmin/reports");
  const activeView = onReports
    ? (pathname.split("/").pop() as ReportSection | undefined)
    : undefined;
  const [reportsOpen, setReportsOpen] = useState(onReports);

  useEffect(() => {
    if (onReports) setReportsOpen(true);
  }, [onReports]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[16rem] shrink-0 flex-col p-3 lg:flex">
      <div className={`${saGlass} flex h-full flex-col p-3`}>
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-black">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-foreground">MaxHigh</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
              Superadmin · D3
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {topNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                params={item.params as never}
                activeOptions={{ exact: Boolean(item.exact) }}
                className={navLinkClass}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-1">
            <button
              type="button"
              onClick={() => setReportsOpen((o) => !o)}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                onReports
                  ? "bg-amber-500/15 text-amber-100"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
              ].join(" ")}
            >
              <BarChart3 size={17} />
              <span className="flex-1 text-left">Report</span>
              <ChevronDown
                size={15}
                className={`transition-transform ${reportsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {reportsOpen && (
              <div className="mt-1 space-y-0.5 rounded-xl border border-amber-500/20 bg-white/[0.05] p-1.5">
                {REPORT_SECTIONS.map((item) => {
                  const active = onReports && activeView === item.slug;
                  return (
                    <Link
                      key={item.slug}
                      to="/superadmin/reports/$view"
                      params={{ view: item.slug }}
                      className={[
                        "block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-amber-500 text-black"
                          : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/superadmin/staff" className={navLinkClass}>
            <ScrollText size={17} />
            Staff actions
          </Link>
        </nav>

        <div className="mt-3 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-4">
          <div className="text-sm font-semibold text-amber-200">Full control</div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-amber-300/70">
            Manage admins, players, game catalog visibility, and Mega Jackpot.
          </p>
        </div>
      </div>
    </aside>
  );
}
