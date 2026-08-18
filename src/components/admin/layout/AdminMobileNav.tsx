import { Link, useRouterState } from "@tanstack/react-router";
import { Headphones, LayoutDashboard, ScrollText, Users } from "lucide-react";

const tabs = [
  { to: "/admin" as const, label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/admin/users" as const, label: "Players", icon: Users, exact: false },
  {
    to: "/admin/reports/$view" as const,
    params: { view: "winlose" as const },
    label: "Reports",
    icon: ScrollText,
    exact: false,
  },
  { to: "/admin/support" as const, label: "Support", icon: Headphones, exact: false },
];

export function AdminMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onReports = pathname.startsWith("/admin/reports");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#0E0C18]/95 px-1.5 pb-[max(3.25rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-0.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.to || pathname === "/admin/"
            : item.to.includes("$view")
              ? onReports
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              params={"params" in item ? item.params : undefined}
              activeOptions={{ exact: item.exact }}
              className={[
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold tracking-wide",
                active ? "bg-violet-600 text-white" : "text-white/45",
              ].join(" ")}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
