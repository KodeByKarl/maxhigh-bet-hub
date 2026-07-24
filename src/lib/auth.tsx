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
  adjustBalanceFn,
  getJackpotFn,
  getSessionFn,
  heartbeatFn,
  loginFn,
  logoutFn,
} from "@/functions/api";
import type { PublicUser } from "@/lib/user";

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
  /** Persist wager debit to MariaDB and update local user.balance (bets only). */
  adjustBalance: (
    delta: number,
    type: "bet",
    opts?: { note?: string; game?: string; gameId?: string },
  ) => Promise<number>;
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
      setUser(session);
    } catch {
      setUser(null);
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

  /** Keep Players Online accurate while this tab is open and logged in. */
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      void heartbeatFn().catch(() => undefined);
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    const onFocus = () => beat();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

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

  const adjustBalance = useCallback(
    async (
      delta: number,
      type: "bet",
      opts?: { note?: string; game?: string; gameId?: string },
    ) => {
      const res = await adjustBalanceFn({
        data: { delta, type, note: opts?.note, game: opts?.game, gameId: opts?.gameId },
      });
      setUser((u) => (u ? { ...u, balance: res.balance } : u));
      if (type === "bet") void refreshJackpot();
      return res.balance;
    },
    [refreshJackpot],
  );

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
      adjustBalance,
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
      adjustBalance,
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
