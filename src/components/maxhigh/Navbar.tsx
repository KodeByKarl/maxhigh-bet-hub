import {
  ChevronDown,
  Bell,
  Gift,
  Settings,
  Globe,
  Plus,
  ArrowDownToLine,
  Wallet,
  LogIn,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
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
import { WalletRequestModal } from "./WalletRequestModal";
import { WalletHistoryModal } from "./WalletHistoryModal";
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
  { id: "gifts" as const, label: "Gifts", icon: Gift },
  { id: "settings" as const, label: "Settings", icon: Settings },
  { id: "world" as const, label: "World", icon: Globe },
];

export function Navbar() {
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [walletMode, setWalletMode] = useState<"deposit" | "withdraw" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { user, isLoggedIn, openLogin, logout } = useAuth();
  const balance = user?.balance ?? 0;
  const initial = (user?.username?.[0] ?? "?").toUpperCase();
  const displayName = user?.displayName || user?.username || "Player";

  function closeMenus() {
    setWalletOpen(false);
    setProfileOpen(false);
  }

  function openWalletRequest(mode: "deposit" | "withdraw") {
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    closeMenus();
    setWalletMode(mode);
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
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
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
                    Balance
                  </span>
                  <span className="text-sm font-black tabular-nums text-foreground">
                    {formatMoney(balance)}
                  </span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              <div className="w-px bg-border" />
              <button
                type="button"
                onClick={() => openWalletRequest("deposit")}
                className="flex items-center gap-1.5 bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Deposit</span>
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
                      {formatMoney(balance)}
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
                        {formatMoney(balance)}
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openWalletRequest("deposit")}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus size={14} strokeWidth={3} /> Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => openWalletRequest("withdraw")}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-transparent text-xs font-bold uppercase tracking-wider text-foreground hover:bg-panel-hover"
                    >
                      <ArrowDownToLine size={14} /> Withdraw
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      setHistoryOpen(true);
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted py-2 text-xs font-semibold text-foreground hover:bg-panel-hover"
                  >
                    <Wallet size={14} /> Transaction history
                  </button>
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
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-panel text-foreground ring-offset-background transition hover:bg-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                  {initial}
                </div>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-panel shadow-xl">
                    <div className="border-b border-border px-4 py-3">
                      <div className="truncate text-sm font-bold text-foreground">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">@{user?.username}</div>
                    </div>

                    <div className="p-1.5">
                      {profileMenu.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openPanel(item.id)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover"
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground">
                              <Icon size={16} />
                            </span>
                            <span className="flex-1">{item.label}</span>
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
                        Log out
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
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm border-border bg-panel text-foreground sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Log out?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to log out of MaxHigh? You can sign back in anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full border-border bg-transparent hover:bg-panel-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmLogout()}
              className="rounded-full bg-danger text-white hover:bg-danger/90"
            >
              Yes, log out
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
      <WalletRequestModal
        open={walletMode !== null}
        mode={walletMode ?? "deposit"}
        balance={balance}
        onOpenChange={(o) => {
          if (!o) setWalletMode(null);
        }}
      />
      <WalletHistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />
    </header>
  );
}
