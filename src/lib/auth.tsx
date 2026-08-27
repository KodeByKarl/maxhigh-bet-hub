import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getJackpotFn, getSessionFn, heartbeatFn, loginFn, logoutFn } from "@/functions/api";
import type { PublicUser } from "@/lib/user";
import { toast } from "sonner";

/** Client idle logout — slightly under server idle so UX feels intentional. */
const CLIENT_IDLE_MS = 55 * 60 * 1000;
const ACTIVITY_HEARTBEAT_MS = 45_000;
const SESSION_POLL_MS = 15_000;

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
  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(0);
  const logoutReasonRef = useRef<"manual" | "expired" | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSessionFn();
      setUser((prevUser) => {
        if (!session && prevUser) {
          if (logoutReasonRef.current !== "manual") {
            toast.error("Your session expired. Please sign in again.", { duration: 6000 });
          }
          logoutReasonRef.current = null;
        }
        if (prevUser && session && JSON.stringify(prevUser) === JSON.stringify(session)) {
          return prevUser;
        }
        return session;
      });
    } catch {
      setUser((prevUser) => {
        if (prevUser && logoutReasonRef.current !== "manual") {
          toast.error("Your session expired. Please sign in again.", { duration: 6000 });
        }
        logoutReasonRef.current = null;
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

  /** Session validation poll — does not bump idle clock on the server. */
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void refreshSession();
    }, SESSION_POLL_MS);
    return () => window.clearInterval(id);
  }, [user, refreshSession]);

  /**
   * Activity → heartbeat (idle clock) + client idle auto-logout.
   * Applies to every role via AuthProvider (player / agent / admin / superadmin).
   */
  useEffect(() => {
    if (!user) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
      const now = Date.now();
      if (now - lastHeartbeatRef.current < ACTIVITY_HEARTBEAT_MS) return;
      lastHeartbeatRef.current = now;
      void heartbeatFn().catch(() => undefined);
    };

    markActivity();

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "mousemove",
    ];
    for (const ev of events) {
      window.addEventListener(ev, markActivity, { passive: true });
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") markActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const idleWatch = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current < CLIENT_IDLE_MS) return;
      logoutReasonRef.current = "expired";
      void logoutFn()
        .catch(() => undefined)
        .finally(() => {
          setUser(null);
          toast.error("Logged out due to inactivity. Please sign in again.", { duration: 6000 });
        });
    }, 30_000);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(idleWatch);
    };
  }, [user]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setLoginOpen(true);
    return false;
  }, [user]);

  const login = useCallback(
    async (username: string, password: string) => {
      const next = await loginFn({ data: { username, password } });
      lastActivityRef.current = Date.now();
      lastHeartbeatRef.current = 0;
      logoutReasonRef.current = null;
      setUser(next);
      setLoginOpen(false);
      await refreshJackpot();
    },
    [refreshJackpot],
  );

  const logout = useCallback(async () => {
    logoutReasonRef.current = "manual";
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
