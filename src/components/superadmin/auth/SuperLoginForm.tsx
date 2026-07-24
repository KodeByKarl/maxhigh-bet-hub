import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginFn } from "@/functions/api";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { Input } from "@/components/ui/input";

export function SuperLoginForm() {
  const { user, isReady, refreshSession, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isReady && user && isSuperadminRole(user.role)) {
      void navigate({ to: "/superadmin" });
    }
  }, [isReady, user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const next = await loginFn({ data: { username, password } });
      if (!isSuperadminRole(next.role)) {
        await logout();
        toast.error("Superadmin account required");
        return;
      }
      await refreshSession();
      toast.success("Welcome, Superadmin");
      await navigate({ to: "/superadmin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#12100E] p-3 sm:p-6">
      <div className="grid h-[min(90dvh,42rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-amber-500/20 bg-[#1C1916] shadow-2xl shadow-black/50 md:grid-cols-[1.15fr_1fr]">
        <div className="relative hidden overflow-hidden md:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#F59E0B_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,#FB923C_0%,transparent_50%),linear-gradient(160deg,#D97706_0%,#F59E0B_50%,#EA580C_100%)]" />
          <img
            src="/maxhigh-mascot.png"
            alt=""
            className="absolute bottom-0 left-1/2 h-[90%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_20px_60px_rgba(245,158,11,0.35)]"
            aria-hidden
          />
          <div className="absolute left-4 top-5 flex items-center gap-2">
            <img src="/maxhigh-chip.png" alt="" className="h-7 w-7 rounded-full" aria-hidden />
            <span className="text-sm font-black text-white">MaxHigh</span>
          </div>
          <p className="absolute bottom-5 left-5 right-5 text-sm font-semibold text-white/90">
            Domain 3 — full control over admins, players, games, and jackpot.
          </p>
        </div>

        <div className="flex flex-col justify-center bg-[#1C1916] px-8 py-10 sm:px-12">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">
            Superadmin · Domain 3
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Sign in</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-14 rounded-xl border-amber-500/25 bg-white/[0.06] text-foreground placeholder:text-muted-foreground focus-visible:ring-amber-500"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-14 rounded-xl border-amber-500/25 bg-white/[0.06] pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="h-14 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-base font-bold text-black shadow-[0_0_24px_rgba(245,158,11,0.25)] disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/admin/login" className="font-semibold text-amber-400 hover:underline">
              Admin portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
