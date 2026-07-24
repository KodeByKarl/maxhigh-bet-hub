import { useState } from "react";
import { toast } from "sonner";
import { adminCreateUserFn } from "@/functions/admin";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";

export function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("1000");
  const [role, setRole] = useState<"player" | "admin">("player");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCreateUserFn({
        data: {
          email: email.trim() || undefined,
          username,
          password,
          balance: Number(balance) || 0,
          role: isSuper ? role : "player",
        },
      });
      toast.success("User created");
      setEmail("");
      setUsername("");
      setPassword("");
      setBalance("1000");
      setRole("player");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Create user</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Username is required for sign-in. Email is optional.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          required
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-11 rounded-xl border-border bg-[#12101C]"
        />
        <Input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border-border bg-[#12101C]"
        />
        <Input
          required
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-xl border-border bg-[#12101C]"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Starting balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="h-11 rounded-xl border-border bg-[#12101C]"
        />
        {isSuper && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "player" | "admin")}
            className="h-11 rounded-xl border border-border bg-[#12101C] px-3 text-sm text-foreground"
          >
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
