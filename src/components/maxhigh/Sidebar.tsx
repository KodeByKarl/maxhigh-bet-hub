import {
  Home, Star, Zap, Ticket, Trophy, Timer, Target, Megaphone,
  Sparkles, Dice5, Crown, FileText, Users, Headphones, ChevronRight, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; icon: LucideIcon; active?: boolean; badge?: string };

const group1: NavItem[] = [
  { label: "Home", icon: Home, active: true },
  { label: "Favourites", icon: Star },
  { label: "Latest Releases", icon: Zap },
];
const group2: NavItem[] = [
  { label: "Lottery", icon: Ticket, badge: "30" },
  { label: "Weekly Race", icon: Trophy },
  { label: "Daily Race", icon: Timer },
  { label: "Challenges", icon: Target },
  { label: "All Promotions", icon: Megaphone },
];
const group3: NavItem[] = [
  { label: "Originals", icon: Sparkles },
  { label: "Slots", icon: Dice5 },
];
const moreItems: NavItem[] = [
  { label: "VIP", icon: Crown },
  { label: "Blog", icon: FileText },
  { label: "Affiliate", icon: Users },
  { label: "Live Support", icon: Headphones },
];

function Row({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <button
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
        item.active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/90 hover:bg-panel-hover",
      ].join(" ")}
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-[#0A0912]">
          {item.badge}
        </span>
      )}
    </button>
  );
}

function Group({ items }: { items: NavItem[] }) {
  return (
    <div className="rounded-2xl bg-panel p-1.5">
      {items.map((it) => <Row key={it.label} item={it} />)}
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
              <span className="text-xs tabular-nums text-muted-foreground">$0.0000</span>
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

      <Group items={group1} />
      <Group items={group2} />

      <div className="flex flex-col gap-1.5">
        {group3.map((it) => (
          <div key={it.label} className="rounded-2xl bg-panel p-1.5">
            <Row item={it} />
          </div>
        ))}
      </div>

      <div className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        More
      </div>
      <div className="rounded-2xl bg-panel p-1.5">
        {moreItems.map((it) => (
          <button
            key={it.label}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground/90 hover:bg-panel-hover"
          >
            <it.icon size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        ))}
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
