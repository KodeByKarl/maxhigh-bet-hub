import {
  Home, Star, Zap, Ticket, Trophy, Timer, Target, Megaphone,
  Sparkles, Dice5, Crown, FileText, Users, Headphones, ChevronRight, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

type NavItem = { label: string; icon: LucideIcon; to: string; badge?: string };

const group1: NavItem[] = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Favourites", icon: Star, to: "/favourites" },
  { label: "Latest Releases", icon: Zap, to: "/latest-releases" },
];
const group2: NavItem[] = [
  { label: "Lottery", icon: Ticket, to: "/lottery", badge: "30" },
  { label: "Weekly Race", icon: Trophy, to: "/weekly-race" },
  { label: "Daily Race", icon: Timer, to: "/daily-race" },
  { label: "Challenges", icon: Target, to: "/challenges" },
  { label: "All Promotions", icon: Megaphone, to: "/promotions" },
];
const group3: NavItem[] = [
  { label: "Originals", icon: Sparkles, to: "/originals" },
  { label: "Slots", icon: Dice5, to: "/slots" },
];
const moreItems: NavItem[] = [
  { label: "VIP", icon: Crown, to: "/vip" },
  { label: "Blog", icon: FileText, to: "/blog" },
  { label: "Affiliate", icon: Users, to: "/affiliate" },
  { label: "Live Support", icon: Headphones, to: "/support" },
];

function Row({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === "/" }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-panel-hover data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-[#0A0912]">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function Group({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="rounded-2xl bg-panel p-1.5">
      {items.map((it) => <Row key={it.label} item={it} onNavigate={onNavigate} />)}
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto no-scrollbar bg-sidebar p-3">
      {onClose && (
        <button onClick={onClose} className="mb-1 grid h-9 w-9 place-items-center self-end rounded-full bg-panel text-foreground lg:hidden">
          <X size={18} />
        </button>
      )}

      <div className="rounded-2xl bg-panel p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-black">
            MH
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">MaxHigh</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">$1,284.50</span>
              <span className="rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-bold text-[#0A0912]">+10.74%</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="h-8 rounded-full border border-border bg-transparent text-xs font-semibold text-foreground hover:bg-panel-hover">
            Convert
          </button>
          <button className="h-8 rounded-full border border-border bg-transparent text-xs font-semibold text-foreground hover:bg-panel-hover">
            Dashboard
          </button>
        </div>
      </div>

      <Group items={group1} onNavigate={onClose} />
      <Group items={group2} onNavigate={onClose} />

      <div className="flex flex-col gap-1.5">
        {group3.map((it) => (
          <div key={it.label} className="rounded-2xl bg-panel p-1.5">
            <Row item={it} onNavigate={onClose} />
          </div>
        ))}
      </div>

      <div className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        More
      </div>
      <div className="rounded-2xl bg-panel p-1.5">
        {moreItems.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground/90 hover:bg-panel-hover data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
          >
            <it.icon size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Casino jackpot mini card */}
      <div className="mt-2 rounded-2xl border border-lime bg-panel p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-lime">Mega Jackpot</div>
        <div className="mt-1 text-xl font-black tabular-nums text-foreground">$248,912</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Ticks every second · Try your luck</div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="hidden w-[260px] shrink-0 border-r border-border lg:block">
        <SidebarContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-border">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
