import {
  LayoutDashboard,
  Users,
  UserCog,
  Gamepad2,
  ScrollText,
  Gem,
  Settings,
  Gift,
  Lock,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type SuperNavItem = {
  to:
    | "/superadmin"
    | "/superadmin/users"
    | "/superadmin/admins"
    | "/superadmin/games"
    | "/superadmin/promotions"
    | "/superadmin/risk"
    | "/superadmin/settings"
    | "/superadmin/jackpot"
    | "/superadmin/staff"
    | "/superadmin/reports/$view";
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  exact?: boolean;
  params?: { view: string };
};

export const SUPER_NAV: SuperNavItem[] = [
  { to: "/superadmin", label: "Command center", shortLabel: "Home", icon: LayoutDashboard, exact: true },
  { to: "/superadmin/users", label: "Player List", shortLabel: "Players", icon: Users },
  { to: "/superadmin/admins", label: "Admins", shortLabel: "Admins", icon: UserCog },
  { to: "/superadmin/games", label: "Games control", shortLabel: "Games", icon: Gamepad2 },
  { to: "/superadmin/promotions", label: "Promotions", shortLabel: "Promos", icon: Gift },
  { to: "/superadmin/risk", label: "Risk Control", shortLabel: "Risk", icon: Lock },
  { to: "/superadmin/settings", label: "System Settings", shortLabel: "Settings", icon: Settings },
  { to: "/superadmin/jackpot", label: "Jackpot", shortLabel: "Jackpot", icon: Gem },
  { to: "/superadmin/staff", label: "Staff actions", shortLabel: "Staff", icon: ScrollText },
];

export const SUPER_MOBILE_TABS: SuperNavItem[] = [
  SUPER_NAV[0],
  SUPER_NAV[1],
  SUPER_NAV[3],
  {
    to: "/superadmin/reports/$view",
    label: "Report",
    shortLabel: "Reports",
    icon: BarChart3,
    params: { view: "winlose" },
  },
];

export const SUPER_MORE_NAV: SuperNavItem[] = SUPER_NAV.filter(
  (item) => !["/superadmin", "/superadmin/users", "/superadmin/games"].includes(item.to),
);
