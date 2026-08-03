import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { Bell, LayoutDashboard, LogOut, ScrollText, Search, Users } from "lucide-react";
import { adminGlass } from "../ui/glass";

export function AdminTopBar() {
  const { user, logout } = useAuth();
  const name = user?.displayName || user?.username || "Admin";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4">
      <div className={`${adminGlass} flex h-14 items-center gap-3 px-3 sm:px-4`}>
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/admin" className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
            <LayoutDashboard size={18} />
          </Link>
          <Link to="/admin/users" className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
            <Users size={18} />
          </Link>
          <Link to="/admin/reports/$view" params={{ view: "winlose" }} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
            <ScrollText size={18} />
          </Link>
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            {initial}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">{name}</div>
            <div className="text-[11px] text-white/40">@{user?.username}</div>
          </div>
        </div>

        <div className="mx-4 hidden min-w-0 flex-1 lg:block">
          <div className="relative mx-auto max-w-2xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              placeholder="Search anything…"
              className="h-10 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-violet-400/40"
              readOnly
              onFocus={(e) => e.currentTarget.blur()}
              title="Coming soon"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55 hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55 hover:text-white"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
