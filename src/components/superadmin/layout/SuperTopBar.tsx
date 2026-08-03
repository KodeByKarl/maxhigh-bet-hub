import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { Gamepad2, LayoutDashboard, LogOut, ScrollText, UserCog, Users } from "lucide-react";
import { saGlass } from "../ui/glass";

export function SuperTopBar() {
  const { user, logout } = useAuth();
  const name = user?.displayName || user?.username || "Superadmin";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4">
      <div className={`${saGlass} flex h-14 items-center gap-3 px-3 sm:px-4`}>
        <div className="flex items-center gap-1 lg:hidden">
          <Link to="/superadmin" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <LayoutDashboard size={18} />
          </Link>
          <Link to="/superadmin/users" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <Users size={18} />
          </Link>
          <Link to="/superadmin/admins" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <UserCog size={18} />
          </Link>
          <Link to="/superadmin/games" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <Gamepad2 size={18} />
          </Link>
          <Link
            to="/superadmin/reports/$view"
            params={{ view: "winlose" }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <ScrollText size={18} />
          </Link>
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-black">
            {initial}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-[11px] uppercase tracking-wide text-amber-700">{user?.role}</div>
          </div>
        </div>

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void logout()}
            className="grid h-9 w-9 place-items-center rounded-full border border-amber-500/25 bg-white/[0.06] text-muted-foreground hover:text-foreground"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
