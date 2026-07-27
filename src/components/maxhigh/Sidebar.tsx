import { useState, useEffect, memo } from "react";
import {
  House,
  Star,
  Bolt,
  Gamepad2,
  Layers2,
  Waves,
  Headset,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/lib/i18n";
import { Logo } from "./Logo";

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
  { label: "Live Support", icon: Headset, to: "/support", accent: "#C6FF3D" },
];

const Row = memo(function Row({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === "/" }}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground/90 transition-colors hover:bg-panel-hover active:bg-panel-hover data-[status=active]:bg-primary data-[status=active]:text-primary-foreground touch-manipulation select-none"
    >
      <Icon size={18} strokeWidth={2.25} className="shrink-0 text-foreground/70 group-hover:text-foreground group-data-[status=active]:text-primary-foreground" />
      <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
      {item.badge && (
        <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-on-lime">
          {item.badge}
        </span>
      )}
    </Link>
  );
});

function Group({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-1.5">
      {items.map((it) => (
        <Row key={it.label} item={it} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const prefs = usePreferences();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { user, isLoggedIn, openLogin, jackpot } = useAuth();
  const balance = user?.balance ?? 0;
  const initial = (user?.username?.[0] ?? "?").toUpperCase();
  const name = isLoggedIn ? (user!.displayName || user!.username) : "Guest";

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto no-scrollbar bg-sidebar/50 backdrop-blur-md p-3">
      <div className="rounded-2xl border border-border bg-panel/70 backdrop-blur-md p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{name}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {mounted && prefs.hideBalance ? formatMoney(balance).replace(/\d/g, "•") : formatMoney(balance)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {isLoggedIn ? (
            <button className="col-span-2 h-8 rounded-full border border-border bg-transparent text-xs font-semibold text-foreground hover:bg-panel-hover active:bg-panel-hover">
              Convert
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onNavigate?.();
                openLogin();
              }}
              className="col-span-2 h-8 rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
            >
              {t("Sign in")}
            </button>
          )}
        </div>
      </div>

      <Group items={group1} onNavigate={onNavigate} />

      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("Games")}
      </div>
      <Group items={gameCategories} onNavigate={onNavigate} />

      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("Account")}
      </div>
      <Group items={supportItems} onNavigate={onNavigate} />

      <div className="mt-2 rounded-2xl border-2 border-lime bg-panel/70 backdrop-blur-md p-3 shadow-[0_0_0_1px_rgba(198,255,61,0.25)]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("Mega Jackpot")}</div>
        <div className="mt-1 text-xl font-black tabular-nums text-foreground">
          {formatMoney(jackpot)}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{t("Live jackpot · Updates as you play")}</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-[260px] shrink-0 self-start overflow-hidden border-r border-border/40 bg-sidebar/30 backdrop-blur-lg md:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Dark overlay backdrop without heavy blur for 60fps mobile speed */}
      <div
        className={`fixed inset-0 bg-black/65 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* GPU hardware-accelerated drawer slide */}
      <div
        className={`fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-sidebar border-r border-border shadow-2xl flex flex-col z-50 overflow-hidden transform transition-transform duration-300 ease-out will-change-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-panel">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-panel-hover hover:text-foreground active:scale-90 transition-transform"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
