import { useState, useEffect } from "react";

/** Client preferences (Settings + World) persisted in localStorage. */

export type AppPreferences = {
  // Account display
  hideBalance: boolean;
  // Gameplay
  soundEnabled: boolean;
  musicEnabled: boolean;
  turboDefault: boolean;
  confirmBets: boolean;
  // Notifications
  notifyWins: boolean;
  notifyPromos: boolean;
  notifySystem: boolean;
  notifyEmail: boolean;
  // Privacy
  showOnlineStatus: boolean;
  shareActivity: boolean;
  // World
  language: string;
  currency: string;
  timezone: string;
  dateFormat: "MDY" | "DMY" | "YMD";
};

export const DEFAULT_PREFS: AppPreferences = {
  hideBalance: false,
  soundEnabled: true,
  musicEnabled: true,
  turboDefault: false,
  confirmBets: true,
  notifyWins: true,
  notifyPromos: true,
  notifySystem: true,
  notifyEmail: false,
  showOnlineStatus: true,
  shareActivity: false,
  language: "en",
  currency: "PHP",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila",
  dateFormat: "MDY",
};

const KEY = "maxhigh.preferences";

export function loadPreferences(): AppPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppPreferences>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePreferences(prefs: AppPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("maxhigh:prefs", { detail: prefs }));
}

export function usePreferences(): AppPreferences {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AppPreferences>;
      setPrefs(customEvent.detail);
    };

    window.addEventListener("maxhigh:prefs", handleUpdate);
    return () => {
      window.removeEventListener("maxhigh:prefs", handleUpdate);
    };
  }, []);

  return prefs;
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
] as const;

export const CURRENCIES = [{ code: "PHP", label: "Philippine Peso (₱)" }] as const;
