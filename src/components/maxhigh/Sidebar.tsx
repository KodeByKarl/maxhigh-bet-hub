import {
  House,
  Star,
  Bolt,
  Gamepad2,
  Layers2,
  Waves,
  Crown,
  Headset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";

type NavItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  badge?: string;
  accent?: string;
};

const group1: NavItem[] = [
  { label: "Home", icon: House, to: "/", accent: "#7C3AED" },
  { label: "Favourites", icon: Star, to: "/favourites", accent: "#EAB308" },
  { label: "Latest Releases", icon: Bolt, to: "/latest-releases", accent: "#C6FF3D" },
];

const gameCategories: NavItem[] = [
  { label: "Slots", icon: Gamepad2, to: "/slots", accent: "#A21CAF" },
  { label: "Cards", icon: Layers2, to: "/cards", accent: "#7C3AED" },
  { label: "Fishing", icon: Waves, to: "/fishing", accent: "#0E7490" },
];

const supportItems: NavItem[] = [
  { label: "VIP", icon: Crown, to: "/vip", accent: "#EAB308" },
  { label: "Live Support", icon: Headset, to: "/support", accent: "#C6FF3D" },
];

function Row({
  item,
  modern = false,
}: {
  item: NavItem;
  modern?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/" }}
      className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-foreground/90 transition-colors hover:bg-panel-hover data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
    >
      {modern ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition-transform group-data-[status=active]:bg-white/20 group-data-[status=active]:text-white"
          style={{ backgroundColor: item.accent ?? "#7C3AED" }}
        >
          <Icon size={18} strokeWidth={2.25} />
        </span>
      ) : (
        <Icon size={18} strokeWidth={2.25} className="shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-on-lime">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function Group({
  items,
  modern,
}: {
  items: NavItem[];
  modern?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-1.5">
      {items.map((it) => (
        <Row key={it.label} item={it} modern={modern} />
      ))}
    </div>
  );
}

function SidebarContent() {
  const { user, isLoggedIn, openLogin, jackpot } = useAuth();
  const balance = user?.balance ?? 0;
  const initial = (user?.username?.[0] ?? "?").toUpperCase();
  const name = isLoggedIn ? (user!.displayName || user!.username) : "Guest";

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto no-scrollbar bg-sidebar p-3">
      <div className="rounded-2xl border border-border bg-panel p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{name}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatMoney(balance)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {isLoggedIn ? (
            <button className="col-span-2 h-8 rounded-full border border-border bg-transparent text-xs font-semibold text-foreground hover:bg-panel-hover">
              Convert
            </button>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="col-span-2 h-8 rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <Group items={group1} modern />

      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Games
      </div>
      <div className="flex flex-col gap-1.5">
        {gameCategories.map((it) => (
          <div key={it.label} className="rounded-2xl border border-border bg-panel p-1.5">
            <Row item={it} modern />
          </div>
        ))}
      </div>

      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Account
      </div>
      <Group items={supportItems} modern />

      <div className="mt-2 rounded-2xl border-2 border-lime bg-panel p-3 shadow-[0_0_0_1px_rgba(198,255,61,0.25)]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Mega Jackpot</div>
        <div className="mt-1 text-xl font-black tabular-nums text-foreground">
          {formatMoney(jackpot)}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Live jackpot · Updates as you play</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-[260px] shrink-0 self-start overflow-hidden border-r border-border md:block">
      <SidebarContent />
    </aside>
  );
}
