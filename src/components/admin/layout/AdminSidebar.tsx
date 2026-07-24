import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Users, ScrollText, Sparkles, Wallet } from "lucide-react";
import { adminGlass } from "../ui/glass";

const nav = [
  { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users" as const, label: "Player List", icon: Users, exact: false },
  { to: "/admin/fund" as const, label: "Fund In/Out", icon: Wallet, exact: false },
  { to: "/admin/audit" as const, label: "Reports", icon: ScrollText, exact: false },
];

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 flex-col p-3 md:flex">
      <div className={`${adminGlass} flex h-full flex-col p-3`}>
        <div className="flex items-center gap-2.5 px-2 py-3">
          <img src="/maxhigh-chip.png" alt="" className="h-8 w-8 rounded-full" aria-hidden />
          <div>
            <div className="text-sm font-black tracking-wide text-white">MaxHigh</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/80">
              Admin
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white data-[status=active]:bg-gradient-to-r data-[status=active]:from-violet-600/90 data-[status=active]:to-fuchsia-600/80 data-[status=active]:text-white data-[status=active]:shadow-[0_0_24px_rgba(124,58,237,0.35)]"
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/20 to-transparent p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles size={15} className="text-violet-200" />
            Staff tip
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/65">
            Balance changes and user creates are written to Audit logs automatically.
          </p>
        </div>
      </div>
    </aside>
  );
}
