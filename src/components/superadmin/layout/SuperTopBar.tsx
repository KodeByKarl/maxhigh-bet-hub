import { useAuth } from "@/lib/auth";
import { LogOut, Shield } from "lucide-react";
import { saGlass } from "../ui/glass";

export function SuperTopBar() {
  const { user, logout } = useAuth();
  const name = user?.displayName || user?.username || "Superadmin";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4">
      <div className={`${saGlass} flex h-12 items-center gap-2.5 px-3 sm:h-14 sm:px-4`}>
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-black">
            <Shield size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-black tracking-wide text-foreground">@{user?.username || name}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">Superadmin</div>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-black">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-foreground">{name}</div>
            <div className="text-[11px] uppercase tracking-wide text-amber-600">{user?.role}</div>
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
