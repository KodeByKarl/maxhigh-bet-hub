import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginFn } from "@/functions/api";
import { recordAdminLoginFn } from "@/functions/admin";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const { user, isReady, refreshSession, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isReady && user && isStaffRole(user.role)) {
      void navigate({ to: "/admin" });
    }
  }, [isReady, user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const next = await loginFn({ data: { username, password } });
      if (!isStaffRole(next.role)) {
        await logout();
        toast.error("This account is not an admin");
        return;
      }
      await refreshSession();
      try {
        await recordAdminLoginFn();
      } catch {
        /* audit write should not block login */
      }
      toast.success("Welcome back");
      setPassword("");
      await navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0912] p-3 sm:p-6">
      <div className="grid h-[min(90dvh,42rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-[#0E0C18] shadow-2xl md:grid-cols-[1.15fr_1fr]">
        {/* Left art — same language as player login */}
        <div className="relative hidden h-full min-h-0 overflow-hidden md:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#4C1D95_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,#1E3A8A_0%,transparent_50%),linear-gradient(160deg,#0A0912_0%,#1A1030_50%,#0A0912_100%)]" />
          <img
            src="/games/candy-peak-bg.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0C18] via-transparent to-[#0E0C18]/40" />
          <img
            src="/maxhigh-mascot.png"
            alt=""
            className="absolute bottom-0 left-1/2 h-[92%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-[0_20px_60px_rgba(124,58,237,0.45)]"
            aria-hidden
          />
          <div className="absolute left-4 top-5 flex items-center gap-2">
            <img src="/maxhigh-chip.png" alt="" className="h-7 w-7 rounded-full" aria-hidden />
            <span className="text-sm font-black tracking-wide text-white">MaxHigh</span>
          </div>
          <p className="absolute bottom-5 left-5 right-5 text-sm font-semibold text-white/80">
            Staff portal — manage players, balances, and live platform stats.
          </p>
        </div>

        {/* Right form */}
        <div className="relative flex h-full flex-col justify-center overflow-y-auto px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7CFF]">
            Admin · Domain 2
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Sign in</h1>
          <p className="sr-only">Sign in to the MaxHigh admin dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              id="admin-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-14 rounded-xl border-transparent bg-[#1A1730] px-4 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#4F7CFF]"
            />

            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-14 rounded-xl border-transparent bg-[#1A1730] px-4 pr-12 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#4F7CFF]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex h-14 w-full items-center justify-center rounded-xl bg-[#4F7CFF] text-base font-semibold text-white shadow-[0_0_24px_rgba(79,124,255,0.35)] transition-colors hover:bg-[#3F6AE6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            <Link to="/" className="font-semibold text-white/70 hover:text-white hover:underline">
              Back to casino
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
