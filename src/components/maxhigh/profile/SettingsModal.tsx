import { useEffect, useState, type ReactNode } from "react";
import {
  Settings,
  User,
  Gamepad2,
  Bell,
  Shield,
  Volume2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "@/lib/preferences";
import { updateProfileFn } from "@/functions/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "account" | "gameplay" | "notifications" | "privacy";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-muted/80 px-4 py-3 hover:bg-muted">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}

const NAV: { id: Section; label: string; icon: typeof User }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "gameplay", label: "Gameplay", icon: Gamepad2 },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
];

export function SettingsModal({ open, onOpenChange }: Props) {
  const { user, refreshSession } = useAuth();
  const [section, setSection] = useState<Section>("account");
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrefs(loadPreferences());
    setDisplayName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setSection("account");
  }, [open, user]);

  function patchPrefs(partial: Partial<AppPreferences>) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePreferences(next);
  }

  async function saveAccount() {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    setBusy(true);
    try {
      await updateProfileFn({
        data: {
          displayName: displayName.trim() || undefined,
          username: username.trim(),
        },
      });
      await refreshSession();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,40rem)] w-[min(100%-1rem,52rem)] max-w-none flex-col gap-0 overflow-hidden border-border bg-panel p-0 text-foreground sm:rounded-3xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Settings size={18} className="text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage your MaxHigh account, gameplay, and privacy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[11rem_1fr]">
          <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-panel-hover hover:text-foreground",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            {section === "account" && (
              <div className="space-y-4">
                <SectionHead title="Profile" subtitle="How you appear across MaxHigh." />
                <Field label="Email (optional)">
                  <Input
                    value={user?.email ?? ""}
                    disabled
                    className="h-11 rounded-xl border-border bg-muted opacity-70"
                    placeholder="No email on file"
                  />
                </Field>
                <Field label="Display name">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Optional public name"
                    className="h-11 rounded-xl border-border bg-muted"
                    maxLength={128}
                  />
                </Field>
                <Field label="Username">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="letters, numbers, underscore"
                    className="h-11 rounded-xl border-border bg-muted"
                    maxLength={64}
                  />
                </Field>
                <Toggle
                  checked={prefs.hideBalance}
                  onChange={(v) => patchPrefs({ hideBalance: v })}
                  label="Hide balance in header"
                  hint="Shows •••• instead of your coin balance."
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveAccount()}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Save size={16} />
                  {busy ? "Saving…" : "Save profile"}
                </button>
              </div>
            )}

            {section === "gameplay" && (
              <div className="space-y-3">
                <SectionHead title="Gameplay" subtitle="Defaults for slots and originals." />
                <Toggle
                  checked={prefs.soundEnabled}
                  onChange={(v) => patchPrefs({ soundEnabled: v })}
                  label="Sound effects"
                  hint="Wins, spins, and UI clicks."
                />
                <Toggle
                  checked={prefs.musicEnabled}
                  onChange={(v) => patchPrefs({ musicEnabled: v })}
                  label="Background music"
                  hint="Ambient music in supported games."
                />
                <Toggle
                  checked={prefs.turboDefault}
                  onChange={(v) => patchPrefs({ turboDefault: v })}
                  label="Turbo by default"
                  hint="Faster spin animations when you open a game."
                />
                <Toggle
                  checked={prefs.confirmBets}
                  onChange={(v) => patchPrefs({ confirmBets: v })}
                  label="Confirm large bets"
                  hint="Ask before bets above your usual stake."
                />
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                  <Volume2 size={14} className="shrink-0 text-primary" />
                  Sound prefs apply on next game session.
                </div>
              </div>
            )}

            {section === "notifications" && (
              <div className="space-y-3">
                <SectionHead title="Alerts" subtitle="Choose what you want to hear about." />
                <Toggle
                  checked={prefs.notifyWins}
                  onChange={(v) => patchPrefs({ notifyWins: v })}
                  label="Big win alerts"
                  hint="Notify when you land notable wins."
                />
                <Toggle
                  checked={prefs.notifyPromos}
                  onChange={(v) => patchPrefs({ notifyPromos: v })}
                  label="Promotions & races"
                  hint="Daily / weekly race and gift reminders."
                />
                <Toggle
                  checked={prefs.notifySystem}
                  onChange={(v) => patchPrefs({ notifySystem: v })}
                  label="System messages"
                  hint="Security and account notices."
                />
                <Toggle
                  checked={prefs.notifyEmail}
                  onChange={(v) => patchPrefs({ notifyEmail: v })}
                  label="Email digests"
                  hint="Occasional summaries to your login email."
                />
              </div>
            )}

            {section === "privacy" && (
              <div className="space-y-3">
                <SectionHead title="Privacy" subtitle="Control what others can see." />
                <Toggle
                  checked={prefs.showOnlineStatus}
                  onChange={(v) => patchPrefs({ showOnlineStatus: v })}
                  label="Show online status"
                  hint="Friends and race boards may see you as active."
                />
                <Toggle
                  checked={prefs.shareActivity}
                  onChange={(v) => patchPrefs({ shareActivity: v })}
                  label="Share activity on Live Wins"
                  hint="Allow your username to appear on the ticker."
                />
                <div className="mt-2 flex items-start gap-2 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                  {prefs.shareActivity ? (
                    <Eye size={14} className="mt-0.5 shrink-0 text-lime" />
                  ) : (
                    <EyeOff size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  Changes save instantly on this device.
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
