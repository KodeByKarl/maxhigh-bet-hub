import { useEffect, useState } from "react";
import { Globe, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LANGUAGES,
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "@/lib/preferences";
import { CURRENCY_CODE, CURRENCY_LABEL } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const DATE_FORMATS: { id: AppPreferences["dateFormat"]; label: string; example: string }[] = [
  { id: "MDY", label: "Month / Day / Year", example: "07/23/2026" },
  { id: "DMY", label: "Day / Month / Year", example: "23/07/2026" },
  { id: "YMD", label: "Year / Month / Day", example: "2026-07-23" },
];

export function WorldModal({ open, onOpenChange }: Props) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());

  useEffect(() => {
    if (!open) return;
    const loaded = loadPreferences();
    const next = { ...loaded, currency: CURRENCY_CODE };
    setPrefs(next);
    if (loaded.currency !== CURRENCY_CODE) savePreferences(next);
  }, [open]);

  function patch(partial: Partial<AppPreferences>, message?: string) {
    const next = { ...prefs, ...partial, currency: CURRENCY_CODE };
    setPrefs(next);
    savePreferences(next);
    if (message) toast.success(message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(100%-1.5rem,32rem)] overflow-y-auto border-border bg-panel p-0 text-foreground sm:rounded-3xl">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Globe size={18} className="text-primary" />
            World
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Language, timezone, and date format. Currency is fixed to Philippine Peso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Language
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => {
                const active = prefs.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => patch({ language: lang.code }, `Language: ${lang.label}`)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-panel-hover",
                    )}
                  >
                    {lang.label}
                    {active && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Currency
            </h3>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-3 text-sm font-semibold text-foreground">
              <span>{CURRENCY_LABEL}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Fixed
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              All balances, bets, and jackpots display in ₱ Philippine Peso.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Timezone
            </h3>
            <select
              value={prefs.timezone}
              onChange={(e) => patch({ timezone: e.target.value }, "Timezone updated")}
              className="h-11 w-full rounded-xl border-0 bg-muted px-3 text-sm font-semibold text-foreground outline-none ring-0 focus:ring-2 focus:ring-primary"
            >
              {[
                prefs.timezone,
                "Asia/Manila",
                "UTC",
                "Asia/Singapore",
                "Asia/Tokyo",
                "Asia/Shanghai",
                "America/New_York",
                "America/Los_Angeles",
                "Europe/London",
                "Europe/Berlin",
                "Australia/Sydney",
              ]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
            </select>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Date format
            </h3>
            <div className="space-y-1.5">
              {DATE_FORMATS.map((f) => {
                const active = prefs.dateFormat === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => patch({ dateFormat: f.id }, `Date format: ${f.example}`)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-panel-hover",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{f.label}</span>
                      <span
                        className={cn("text-xs", active ? "text-white/80" : "text-muted-foreground")}
                      >
                        {f.example}
                      </span>
                    </span>
                    {active && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
