import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function LoginModal() {
  const { loginOpen, closeLogin, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loginOpen) {
      setPassword("");
      setShowPassword(false);
      setBusy(false);
    }
  }, [loginOpen]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
      toast.success("Welcome back");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={loginOpen} onOpenChange={(open) => !open && closeLogin()}>
      <DialogContent
        className="h-[min(90dvh,42rem)] w-[min(100%-1rem,72rem)] max-w-none gap-0 overflow-hidden border-border bg-panel p-0 text-foreground shadow-2xl sm:rounded-3xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:text-muted-foreground"
      >
        <div className="grid h-full md:grid-cols-[1.15fr_1fr]">
          <div className="relative hidden h-full min-h-0 overflow-hidden md:block">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#7C3AED_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,#A78BFA_0%,transparent_50%),linear-gradient(160deg,#4C1D95_0%,#7C3AED_50%,#5B21B6_100%)]" />
            <img
              src="/games/candy-peak-bg.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/30" />
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
          </div>

          <div className="relative flex h-full flex-col justify-center overflow-y-auto bg-panel px-8 py-10 sm:px-12 lg:px-14">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sign in
            </DialogTitle>
            <DialogDescription className="sr-only">
              Sign in to your MaxHigh account to play games.
            </DialogDescription>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Input
                id="mh-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="h-14 rounded-xl border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />

              <div className="relative">
                <Input
                  id="mh-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-14 rounded-xl border-border bg-muted px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-panel-hover hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-1 flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
