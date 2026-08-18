import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { adminGlass } from "../ui/glass";

function roleLabel(role?: string) {
  if (role === "master_agent") return "Master Agent";
  if (role === "agent") return "Agent";
  return "Admin";
}

export function AdminTopBar() {
  const { user, logout } = useAuth();
  const name = user?.displayName || user?.username || "Admin";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4">
      <div className={`${adminGlass} flex h-12 items-center gap-2.5 px-3 sm:h-14 sm:px-4`}>
        <div className="flex min-w-0 items-center gap-2.5 md:hidden">
          <img src="/maxhigh-chip.png" alt="" className="h-8 w-8 shrink-0 rounded-full" aria-hidden />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-black tracking-wide text-white">@{user?.username || name}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
              {roleLabel(user?.role)}
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2.5 md:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="text-[11px] text-white/40">
              @{user?.username} · {roleLabel(user?.role)}
            </div>
          </div>
        </div>

        <div className="ml-auto">
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
