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
import { changePasswordFn } from "@/functions/api";
import { useTranslation } from "@/lib/i18n";
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
  const { t } = useTranslation();
  const { user, refreshSession } = useAuth();
  const [section, setSection] = useState<Section>("account");
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrefs(loadPreferences());
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaveStatus("idle");
    setSection("account");
  }, [open]);

  function patchPrefs(partial: Partial<AppPreferences>) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePreferences(next);
  }

  const PASSWORD_RULES = [
    { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
    { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  function getPasswordStrength(pwd: string) {
    if (!pwd) return { score: 0, label: "None", color: "bg-border", textClass: "text-muted-foreground" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: t("Weak"), color: "bg-rose-500", textClass: "text-rose-400" };
    if (score <= 4) return { score, label: t("Medium"), color: "bg-amber-500", textClass: "text-amber-400" };
    return { score, label: t("Strong"), color: "bg-emerald-500", textClass: "text-emerald-400" };
  }

  const strength = getPasswordStrength(newPassword);
  const strengthProgress = (strength.score / 5) * 100;

  async function handleSavePassword() {
    if (!oldPassword) {
      toast.error("Current password is required");
      return;
    }
    const allRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));
    if (!allRulesMet) {
      toast.error("Password does not meet all verification rules");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaveStatus("saving");
    setBusy(true);
    try {
      await changePasswordFn({
        data: {
          oldPassword,
          newPassword,
        },
      });
      setSaveStatus("success");
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setSaveStatus("error");
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  // AutoSave debounced effect
  useEffect(() => {
    if (!autoSave) return;
    if (!oldPassword || !newPassword || !confirmPassword) return;

    const allRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));
    const match = newPassword === confirmPassword;

    if (allRulesMet && match && oldPassword.length >= 1) {
      const timer = setTimeout(() => {
        void handleSavePassword();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [oldPassword, newPassword, confirmPassword, autoSave]);

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
                  {t(item.label)}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            {section === "account" && (
              <div className="space-y-4">
                <SectionHead title={t("Change Password")} subtitle={t("Update your MaxHigh account credentials.")} />
                
                <Field label={t("Old Password")}>
                  <div className="relative">
                    <Input
                      type={showOld ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11 rounded-xl border-border bg-muted pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label={t("New Password")}>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="h-11 rounded-xl border-border bg-muted pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label={t("Confirm Password")}>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-11 rounded-xl border-border bg-muted pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("Password Strength:")}</span>
                      <span className={cn("font-bold", strength.textClass)}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-300", strength.color)}
                        style={{ width: `${strengthProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Verification Rules / Hint")}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(newPassword);
                      return (
                        <div key={rule.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                              passed
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {passed ? "✓" : "•"}
                          </span>
                          <span className={cn(passed ? "text-foreground" : "text-muted-foreground")}>
                            {t(rule.label)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Toggle
                  checked={autoSave}
                  onChange={(v) => setAutoSave(v)}
                  label={t("Enable AutoSave")}
                  hint={t("Automatically save password once all rules are met and confirmed.")}
                />

                <Toggle
                  checked={prefs.hideBalance}
                  onChange={(v) => patchPrefs({ hideBalance: v })}
                  label={t("Hide balance in header")}
                  hint={t("Shows •••• instead of your coin balance.")}
                />

                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !oldPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword ||
                      !PASSWORD_RULES.every((r) => r.test(newPassword))
                    }
                    onClick={() => void handleSavePassword()}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {busy ? t("Saving…") : t("Save Password")}
                  </button>

                  {saveStatus === "saving" && (
                    <span className="text-xs text-muted-foreground animate-pulse">{t("Saving changes…")}</span>
                  )}
                  {saveStatus === "success" && (
                    <span className="text-xs text-emerald-400 font-medium">✓ {t("Saved successfully")}</span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-xs text-rose-400 font-medium">✗ {t("Failed to save")}</span>
                  )}
                </div>
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
