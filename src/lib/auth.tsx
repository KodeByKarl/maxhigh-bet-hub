import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getJackpotFn,
  getSessionFn,
  heartbeatFn,
  loginFn,
  logoutFn,
} from "@/functions/api";
import type { PublicUser } from "@/lib/user";
import { toast } from "sonner";

export type AuthUser = PublicUser;

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isReady: boolean;
  jackpot: number;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  requireAuth: () => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshJackpot: () => Promise<void>;
  /** Update local session balance after a server settle response (never invent credits). */
  setBalanceLocal: (balance: number) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [jackpot, setJackpot] = useState(0);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSessionFn();
      setUser((prevUser) => {
        if (!session && prevUser) {
          toast.error("You've been logged out because your account was accessed from another device.", {
            duration: 6000,
          });
        }
        // Preserve object equality if properties haven't changed to prevent re-render loops
        if (prevUser && session && JSON.stringify(prevUser) === JSON.stringify(session)) {
          return prevUser;
        }
        return session;
      });
    } catch {
      setUser((prevUser) => {
        if (prevUser) {
          toast.error("You've been logged out because your account was accessed from another device.", {
            duration: 6000,
          });
        }
        return null;
      });
    }
  }, []);

  const refreshJackpot = useCallback(async () => {
    try {
      const jp = await getJackpotFn();
      setJackpot(jp.amount);
    } catch {
      /* DB may be offline during first boot */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([refreshSession(), refreshJackpot()]);
      if (!cancelled) setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, refreshJackpot]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshJackpot();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refreshJackpot]);

  /** Real-time single-device session validation poll (every 5 seconds) */
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void refreshSession();
    }, 5000);
    return () => window.clearInterval(id);
  }, [user, refreshSession]);

  /** Keep Players Online accurate while this tab is open and logged in. */
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      void heartbeatFn().catch(() => undefined);
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    const onFocus = () => {
      beat();
      void refreshSession();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refreshSession]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setLoginOpen(true);
    return false;
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const next = await loginFn({ data: { username, password } });
    setUser(next);
    setLoginOpen(false);
    await refreshJackpot();
  }, [refreshJackpot]);

  const logout = useCallback(async () => {
    await logoutFn();
    setUser(null);
  }, []);

  const setBalanceLocal = useCallback((balance: number) => {
    setUser((u) => (u ? { ...u, balance } : u));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isReady,
      jackpot,
      loginOpen,
      openLogin,
      closeLogin,
      requireAuth,
      login,
      logout,
      refreshSession,
      refreshJackpot,
      setBalanceLocal,
    }),
    [
      user,
      isReady,
      jackpot,
      loginOpen,
      openLogin,
      closeLogin,
      requireAuth,
      login,
      logout,
      refreshSession,
      refreshJackpot,
      setBalanceLocal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
