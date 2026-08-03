import {
  ChevronDown,
  Bell,
  Settings,
  Globe,
  LogIn,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
import { formatMoney } from "@/lib/currency";
import { useTranslation } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NotificationsModal } from "./profile/NotificationsModal";
import { GiftsModal } from "./profile/GiftsModal";
import { SettingsModal } from "./profile/SettingsModal";
import { WorldModal } from "./profile/WorldModal";
import { toast } from "sonner";

function ChipIcon({ className }: { className?: string }) {
  return (
    <img
      src="/maxhigh-chip.png"
      alt=""
      width={24}
      height={24}
      className={`shrink-0 rounded-full object-contain ${className ?? ""}`}
      aria-hidden
    />
  );
}

type Panel = "notifications" | "gifts" | "settings" | "world" | null;

const profileMenu = [
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "settings" as const, label: "Settings", icon: Settings },
  { id: "world" as const, label: "World", icon: Globe },
];

export function Navbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { t } = useTranslation();
  const prefs = usePreferences();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const { user, isLoggedIn, openLogin, logout } = useAuth();
  const balance = user?.balance ?? 0;
  const initial = (user?.username?.[0] ?? "?").toUpperCase();
  const displayName = user?.displayName || user?.username || "Player";

  function closeMenus() {
    setWalletOpen(false);
    setProfileOpen(false);
  }

  function openPanel(id: Panel) {
    closeMenus();
    setPanel(id);
  }

  async function confirmLogout() {
    closeMenus();
    setLogoutOpen(false);
    await logout();
    toast.success("You have been logged out");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-sidebar/40 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 sm:gap-3 px-3 sm:px-4">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-panel text-foreground md:hidden hover:bg-panel-hover active:scale-95 touch-manipulation transition-all"
            aria-label="Open sidebar menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="shrink-0">
          <Logo />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <div className="flex h-11 items-stretch overflow-hidden rounded-full border border-border bg-panel">
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    openLogin();
                    return;
                  }
                  setProfileOpen(false);
                  setWalletOpen((v) => !v);
                }}
                className="flex items-center gap-2 px-3 hover:bg-panel-hover"
                aria-label="Wallet"
              >
                <ChipIcon className="h-6 w-6" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Balance")}
                  </span>
                  <span className="text-sm font-black tabular-nums text-foreground">
                    {mounted && prefs.hideBalance ? formatMoney(balance).replace(/\d/g, "•") : formatMoney(balance)}
                  </span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </div>

            {walletOpen && isLoggedIn && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setWalletOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-border bg-panel p-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <ChipIcon className="h-5 w-5" />
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Wallet
                    </div>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums text-foreground">
                      {mounted && prefs.hideBalance ? formatMoney(balance).replace(/\d/g, "•") : formatMoney(balance)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      className="flex flex-col items-start rounded-xl bg-muted p-3 hover:bg-panel-hover"
                    >
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <ChipIcon className="h-3.5 w-3.5" />
                        PHP · Philippine Peso
                      </span>
                      <span className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                        {mounted && prefs.hideBalance ? formatMoney(balance).replace(/\d/g, "•") : formatMoney(balance)}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setWalletOpen(false);
                  setProfileOpen((v) => !v);
                }}
                className="flex h-11 items-center gap-2 rounded-full border border-border bg-panel px-2 py-1 hover:bg-panel-hover"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                  {initial}
                </div>
                <ChevronDown size={14} className="mr-1 text-muted-foreground" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-panel shadow-xl">
                    <div className="border-b border-border p-4">
                      <div className="font-bold text-foreground">{displayName}</div>
                      <div className="text-xs text-muted-foreground">{user?.email ?? "—"}</div>
                    </div>

                    <div className="p-1.5">
                      {profileMenu.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openPanel(item.id)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground/90 transition-colors hover:bg-panel-hover"
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                              <Icon size={16} />
                            </span>
                            {t(item.label)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-border p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setLogoutOpen(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-danger/15 text-danger">
                          <LogOut size={16} />
                        </span>
                        {t("Log out")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-panel px-3 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-panel-hover sm:px-4"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">{t("Sign in")}</span>
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm border-border bg-panel text-foreground sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">{t("Log out?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("Are you sure you want to log out of MaxHigh? You can sign back in anytime.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full border-border bg-transparent hover:bg-panel-hover">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmLogout()}
              className="rounded-full bg-danger text-white hover:bg-danger/90"
            >
              {t("Yes, log out")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NotificationsModal
        open={panel === "notifications"}
        onOpenChange={(o) => setPanel(o ? "notifications" : null)}
      />
      <GiftsModal open={panel === "gifts"} onOpenChange={(o) => setPanel(o ? "gifts" : null)} />
      <SettingsModal
        open={panel === "settings"}
        onOpenChange={(o) => setPanel(o ? "settings" : null)}
      />
      <WorldModal open={panel === "world"} onOpenChange={(o) => setPanel(o ? "world" : null)} />
    </header>
  );
}
