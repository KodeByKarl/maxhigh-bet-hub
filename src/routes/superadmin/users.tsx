import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listSuperUsersFn,
  superAdjustBalanceFn,
  superCreateUserFn,
  superSetUserRoleFn,
  superUpdateUserFn,
  superGetUserSecurityDetailsFn,
  superToggleLockUserFn,
  superForceLogoutUserFn,
  superResetFailedAttemptsFn,
} from "@/functions/superadmin";
import type { SuperUserRow } from "@/lib/superadmin-types";
import type { UserRole } from "@/lib/user";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

export const Route = createFileRoute("/superadmin/users")({
  component: SuperUsersPage,
});

function SuperUsersPage() {
  const { user, isReady } = useAuth();
  const [rows, setRows] = useState<SuperUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [editing, setEditing] = useState<SuperUserRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    type: "menu" | "view" | "profile" | "edit" | "copy" | "password" | "security" | "winLimit" | "suspicious" | "addChips";
    user: SuperUserRow;
  } | null>(null);

  const load = useCallback(async () => {
    const data = await listSuperUsersFn({ data: { q: q || undefined, role, limit: 200 } });
    setRows(data);
  }, [q, role]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "az") return a.username.localeCompare(b.username);
      if (sortBy === "za") return b.username.localeCompare(a.username);
      return 0;
    });
  }, [rows, sortBy]);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => setRows([]));
  }, [isReady, user, load]);

  async function setUserRole(userId: string, next: UserRole) {
    try {
      await superSetUserRoleFn({ data: { userId, role: next } });
      toast.success("Role updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Player List</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all accounts, create users, edit profile, username, and password.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username or email…"
            className="h-11 max-w-xs rounded-xl border-amber-500/20 bg-white/[0.06] text-foreground"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | "all")}
            className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm text-foreground [color-scheme:dark]"
          >
            <option value="all" className="bg-white text-stone-900">
              All Roles
            </option>
            <option value="player" className="bg-white text-stone-900">
              Player
            </option>
            <option value="agent" className="bg-white text-stone-900">
              Agent
            </option>
            <option value="master_agent" className="bg-white text-stone-900">
              Master Agent
            </option>
            <option value="superadmin" className="bg-white text-stone-900">
              SuperAdmin
            </option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "az" | "za")}
            className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm font-bold text-amber-400 [color-scheme:dark]"
          >
            <option value="newest" className="bg-white text-stone-900">
              Newest → Oldest
            </option>
            <option value="oldest" className="bg-white text-stone-900">
              Oldest → Newest
            </option>
            <option value="az" className="bg-white text-stone-900">
              Alphabetical (A - Z)
            </option>
            <option value="za" className="bg-white text-stone-900">
              Alphabetical (Z - A)
            </option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="h-11 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
          >
            Refresh
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 h-11 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform"
        >
          + Add Player
        </button>
      </div>

      <div className={`${saGlass} overflow-x-auto`}>
        <table className="w-full text-left text-sm table-fixed border-collapse">
          <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground bg-white/[0.02]">
            <tr>
              <th className="w-[20%] px-4 py-3.5">Player</th>
              <th className="w-[18%] px-4 py-3.5 text-center">Created By / Agent</th>
              <th className="w-[12%] px-4 py-3.5 text-center">Role</th>
              <th className="w-[15%] px-4 py-3.5 text-center">Balance</th>
              <th className="w-[35%] px-4 py-3.5 text-center">Actions Grid</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                <td className="w-[20%] px-4 py-4 align-middle">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground truncate">@{u.username}</span>
                    {u.isLocked === "yes" ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300 uppercase tracking-wide shrink-0 animate-pulse">
                        🔒 LOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wide shrink-0">
                        🟢 ACTIVE
                      </span>
                    )}
                  </div>
                  {u.displayName && (
                    <div className="text-[11px] text-amber-400 truncate">{u.displayName}</div>
                  )}
                  <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">ID: {u.id.slice(0, 8)}…</div>
                </td>

                <td className="w-[18%] px-4 py-4 align-middle text-center">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                    🛡️ @{u.parentAgentUsername || "System / Direct"}
                  </span>
                </td>

                <td className="w-[12%] px-4 py-4 align-middle text-center">
                  <select
                    value={u.role}
                    onChange={(e) => void setUserRole(u.id, e.target.value as UserRole)}
                    className="h-9 w-full max-w-[130px] rounded-xl border border-amber-500/20 bg-[#161224] px-2 text-xs font-bold text-foreground text-center mx-auto [color-scheme:dark]"
                  >
                    <option value="player">Player</option>
                    <option value="agent">Agent</option>
                    <option value="master_agent">Master Agent</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </td>

                <td className="w-[15%] px-4 py-4 align-middle text-center font-black tabular-nums text-emerald-400 text-base">
                  {formatMoney(u.balance)}
                </td>

                {/* Clean Balanced Actions Grid */}
                <td className="w-[50%] px-4 py-4 align-middle">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "menu", user: u })}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                    >
                      Menu
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "view", user: u })}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-foreground/90 hover:bg-white/10 active:scale-95 transition-all"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "profile", user: u })}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-foreground/90 hover:bg-white/10 active:scale-95 transition-all"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "addChips", user: u })}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition-all"
                    >
                      Add / Withdraw
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "copy", user: u })}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-foreground/90 hover:bg-white/10 active:scale-95 transition-all"
                    >
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                    >
                      Password
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "security", user: u })}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                    >
                      Security Code
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "winLimit", user: u })}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                    >
                      Win Limit
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "suspicious", user: u })}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      Suspicious Check
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            void load();
          }}
          existingUsernames={rows.map((r) => r.username.toLowerCase())}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {activeModal && (
        <PlayerActionModal
          modal={activeModal}
          onClose={() => setActiveModal(null)}
          onActionComplete={() => void load()}
        />
      )}
    </div>
  );
}

function AddPlayerModal({
  onClose,
  onCreated,
  existingUsernames,
}: {
  onClose: () => void;
  onCreated: () => void;
  existingUsernames: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [balance, setBalance] = useState("0");

  // System generator
  const generateSystemCredentials = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const sysUser = `player_${randomNum}`;
    const sysId = crypto.randomUUID();
    const sysPass = Math.random().toString(36).slice(-8) + "A1!";
    setUsername(sysUser);
    setUserId(sysId);
    setPassword(sysPass);
    toast.info("System generated User ID, username & password!");
  };

  // Live password validation
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  // Live username verification
  const isUsernameTaken = username.trim() !== "" && existingUsernames.includes(username.trim().toLowerCase());
  const isUsernameValid = username.trim().length >= 3 && !isUsernameTaken;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isUsernameTaken) {
      toast.error(`Username '@${username}' is already taken!`);
      return;
    }
    if (!isPasswordValid) {
      toast.error("Password must be at least 6 characters with letters and numbers!");
      return;
    }

    setBusy(true);
    try {
      await superCreateUserFn({
        data: {
          email: email.trim() || undefined,
          username: username.trim(),
          password: password.trim(),
          role,
          balance: Number(balance) || 0,
        },
      });
      toast.success(`Account @${username.trim()} created successfully!`);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`${saGlass} w-full max-w-xl space-y-4 p-6 border border-amber-500/30 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div>
            <h2 className="text-xl font-black text-foreground">Add New Player / User</h2>
            <p className="text-xs text-muted-foreground">Create account with system-generated or custom credentials</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <span className="text-xs font-bold text-amber-300">Quick System Generator</span>
          <button
            type="button"
            onClick={generateSystemCredentials}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-black hover:bg-amber-400 active:scale-95 transition-transform"
          >
            ⚡ Auto-Generate All
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (!userId) setUserId(`usr_${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
              }}
              required
              placeholder="e.g. player888"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
            {username.trim() !== "" && (
              <div className="mt-1 text-[11px] font-semibold">
                {isUsernameTaken ? (
                  <span className="text-rose-400">❌ Username already exists!</span>
                ) : (
                  <span className="text-emerald-400">✓ Username available</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              User ID (System / Custom)
            </label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Auto-generated UUID or custom ID"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              Password Verification
            </label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="text"
              placeholder="System generated or custom password"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground font-mono"
            />
            {/* Live Password Verification Status */}
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div className={`rounded-lg px-2 py-1 border text-center font-bold ${hasMinLength ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-muted-foreground"}`}>
                {hasMinLength ? "✓ 6+ Chars" : "Min 6 Chars"}
              </div>
              <div className={`rounded-lg px-2 py-1 border text-center font-bold ${hasLetter ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-muted-foreground"}`}>
                {hasLetter ? "✓ Has Letter" : "Contains Letter"}
              </div>
              <div className={`rounded-lg px-2 py-1 border text-center font-bold ${hasNumber ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-muted-foreground"}`}>
                {hasNumber ? "✓ Has Number" : "Contains Number"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm font-bold text-foreground [color-scheme:dark]"
            >
              <option value="player">Player</option>
              <option value="agent">Agent</option>
              <option value="master_agent">Master Agent</option>
              <option value="superadmin">SuperAdmin</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              Initial Balance (₱)
            </label>
            <Input
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              type="number"
              min={0}
              placeholder="0 by default"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-amber-500/25 px-5 text-xs font-bold uppercase text-foreground hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !isPasswordValid || !isUsernameValid}
            className="h-11 rounded-xl bg-amber-500 px-6 text-xs font-black uppercase tracking-wider text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Player"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: SuperUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await superUpdateUserFn({
        data: {
          userId: user.id,
          username: username.trim(),
          email: email.trim() || null,
          displayName: displayName.trim() || null,
          ...(password.trim() ? { password: password.trim() } : {}),
        },
      });
      toast.success("User updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`${saGlass} w-full max-w-md space-y-3 p-5 shadow-xl`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit @{user.username}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.06]">
            <X size={18} />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Username</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Email</span>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Optional"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Display name</span>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">
            New password
          </span>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Leave blank to keep current"
            className="h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-amber-500/25 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlayerActionModal({
  modal,
  onClose,
  onActionComplete,
}: {
  modal: {
    type: "menu" | "view" | "profile" | "edit" | "copy" | "password" | "security" | "winLimit" | "suspicious" | "addChips";
    user: SuperUserRow;
  };
  onClose: () => void;
  onActionComplete?: () => void;
}) {
  const { user, type } = modal;
  const [isLocked, setIsLocked] = useState(user.isLocked === "yes");
  const [winLimitInput, setWinLimitInput] = useState("20000");
  const [securityCode, setSecurityCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [chipAmount, setChipAmount] = useState("1000");
  const [chipNote, setChipNote] = useState("");
  const [chipMode, setChipMode] = useState<"add" | "withdraw">("add");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [chipBusy, setChipBusy] = useState(false);

  const [auditDetails, setAuditDetails] = useState<{
    totalBets: number;
    totalWins: number;
    netPnL: number;
    totalTransactions: number;
    largeWinCount: number;
    lastSeenAt: string;
    statusText: string;
    isSuspicious: boolean;
    recentLogs: Array<{ id: string; action: string; summary: string; timestamp: string }>;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    void superGetUserSecurityDetailsFn({ data: { userId: user.id } })
      .then((res) => {
        setSecurityCode(res.securityCode);
        setAuditDetails(res);
      })
      .catch(() => setSecurityCode(user.id.slice(0, 6).toUpperCase()))
      .finally(() => setLoading(false));
  }, [type, user.id]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const titles: Record<string, string> = {
    menu: "Player Management Options",
    view: "Player Activity History",
    profile: "Player Account Profile",
    copy: "Copy Player Identity",
    security: "Player Security Code",
    winLimit: "Set Weekly Win Limit",
    suspicious: "Full Audit Summary & Risk Inspection",
    addChips: "Manage Player Chips",
  };

  const handleChipTransfer = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(chipAmount);
    if (!val || val <= 0) {
      toast.error("Enter a valid chip amount");
      return;
    }
    if (chipMode === "withdraw" && val > user.balance) {
      toast.error(`@${user.username} only has ₱${user.balance.toLocaleString("en-PH")}`);
      return;
    }
    if (!confirmPassword.trim()) {
      toast.error("Enter your password to confirm this chip action");
      return;
    }
    const delta = chipMode === "add" ? val : -val;
    setChipBusy(true);
    try {
      await superAdjustBalanceFn({
        data: {
          userId: user.id,
          delta,
          confirmPassword,
          note:
            chipNote.trim() ||
            (chipMode === "add" ? "Superadmin chip credit" : "Superadmin chip withdrawal"),
        },
      });
      toast.success(
        chipMode === "add"
          ? `Added ₱${val.toLocaleString("en-PH")} chips to @${user.username}`
          : `Withdrew ₱${val.toLocaleString("en-PH")} chips from @${user.username}`,
      );
      onActionComplete?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setChipBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${saGlass} w-full ${type === "suspicious" || type === "view" ? "max-w-4xl" : "max-w-xl"} space-y-4 p-6 border border-amber-500/30 shadow-2xl my-auto transition-all`}
      >
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div>
            <h2 className="text-xl font-black text-foreground">{titles[type] ?? "Player Action"}</h2>
            <p className="text-xs text-muted-foreground">Target Player: <span className="text-amber-400 font-bold">@{user.username}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06]">
            <X size={20} />
          </button>
        </div>

        {/* Chip Add / Withdraw */}
        {type === "addChips" && (
          <form onSubmit={handleChipTransfer} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChipMode("add")}
                className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
                  chipMode === "add" ? "bg-emerald-500 text-black" : "border border-white/10 text-muted-foreground"
                }`}
              >
                Add Chips
              </button>
              <button
                type="button"
                onClick={() => setChipMode("withdraw")}
                className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
                  chipMode === "withdraw" ? "bg-rose-500 text-white" : "border border-white/10 text-muted-foreground"
                }`}
              >
                Withdraw
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current balance: <span className="font-bold text-emerald-400">{formatMoney(user.balance)}</span>
            </p>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Amount (₱)</label>
              <Input
                type="number"
                min={1}
                step="any"
                max={chipMode === "withdraw" ? user.balance : undefined}
                value={chipAmount}
                onChange={(e) => setChipAmount(e.target.value)}
                required
                className="h-10 bg-white/[0.06] text-foreground font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Note</label>
              <Input
                value={chipNote}
                onChange={(e) => setChipNote(e.target.value)}
                placeholder="Optional"
                className="h-10 bg-white/[0.06] text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Confirm with your password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Super Admin password"
                className="h-10 bg-white/[0.06] text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={chipBusy}
              className={`h-11 w-full rounded-xl text-xs font-black uppercase disabled:opacity-60 ${
                chipMode === "add"
                  ? "bg-emerald-500 text-black"
                  : "bg-rose-500 text-white"
              }`}
            >
              {chipBusy
                ? "Processing…"
                : chipMode === "add"
                  ? `Add ₱${Number(chipAmount || 0).toLocaleString("en-PH")}`
                  : `Withdraw ₱${Number(chipAmount || 0).toLocaleString("en-PH")}`}
            </button>
          </form>
        )}

        {/* Win Limit Form */}
        {type === "winLimit" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Manually specify maximum winning payout limit for @{user.username}:</p>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Weekly Win Limit Payout (₱)
              </label>
              <Input
                value={winLimitInput}
                onChange={(e) => setWinLimitInput(e.target.value)}
                type="number"
                min={0}
                placeholder="e.g. 20000"
                className="h-11 rounded-xl bg-white/[0.06] text-foreground font-bold text-base"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                toast.success(`Weekly Win Limit set to ₱${Number(winLimitInput).toLocaleString("en-PH")} for @${user.username}!`);
                onClose();
              }}
              className="h-11 w-full rounded-xl bg-amber-500 text-xs font-black uppercase text-black hover:bg-amber-400"
            >
              Save Win Limit Setting
            </button>
          </div>
        )}

        {/* Security Code Form */}
        {type === "security" && (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-muted-foreground">System Generated Security Code for Verification:</p>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 py-4 font-mono text-3xl font-black tracking-widest text-amber-300">
              {loading ? "FETCHING…" : securityCode}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(securityCode, "Security Code")}
              className="h-11 w-full rounded-xl border border-amber-500/30 bg-white/[0.05] text-xs font-bold uppercase text-foreground hover:bg-white/10"
            >
              📋 Copy Security Code
            </button>
          </div>
        )}

        {/* Copy Form */}
        {type === "copy" && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">User ID</label>
              <div className="flex gap-2">
                <Input value={user.id} readOnly className="h-10 font-mono text-xs bg-white/[0.06] text-foreground" />
                <button
                  type="button"
                  onClick={() => handleCopy(user.id, "User ID")}
                  className="rounded-xl bg-amber-500 px-4 text-xs font-bold text-black hover:bg-amber-400"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Username</label>
              <div className="flex gap-2">
                <Input value={user.username} readOnly className="h-10 bg-white/[0.06] text-foreground" />
                <button
                  type="button"
                  onClick={() => handleCopy(user.username, "Username")}
                  className="rounded-xl bg-amber-500 px-4 text-xs font-bold text-black hover:bg-amber-400"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MENU MODAL: Quick Management Actions */}
        {type === "menu" && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs ${
              isLocked
                ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            }`}>
              <span>Current Account Status:</span>
              <span className="flex items-center gap-1.5 uppercase font-black tracking-wider">
                {isLocked ? "🔒 LOCKED" : "🔓 UNLOCKED / ACTIVE"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">Quick management controls for player <span className="text-amber-400 font-bold">@{user.username}</span>:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await superToggleLockUserFn({
                      data: { userId: user.id, lock: !isLocked },
                    });
                    const lockedNow = res.isLocked === "yes";
                    setIsLocked(lockedNow);
                    toast.success(`Account @${res.username} ${lockedNow ? "Locked" : "Unlocked"} successfully!`);
                    onActionComplete?.();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Lock action failed");
                  }
                }}
                className={`p-3.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                  isLocked
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                }`}
              >
                <span className="text-lg">{isLocked ? "🔓" : "🔒"}</span>
                <span>{isLocked ? "Unlock Account" : "Lock Account"}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await superForceLogoutUserFn({ data: { userId: user.id } });
                    toast.info(`Active sessions terminated for @${res.username}`);
                    onActionComplete?.();
                    onClose();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Logout failed");
                  }
                }}
                className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold text-xs flex flex-col items-center gap-1.5 transition-all"
              >
                <span className="text-lg">🚫</span>
                <span>Force Logout</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await superResetFailedAttemptsFn({ data: { userId: user.id } });
                    toast.success(`Failed login attempts reset for @${res.username}`);
                    onActionComplete?.();
                    onClose();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Reset failed");
                  }
                }}
                className="p-3.5 rounded-xl border border-white/10 bg-white/[0.05] text-foreground hover:bg-white/10 font-bold text-xs flex flex-col items-center gap-1.5 transition-all"
              >
                <span className="text-lg">🔄</span>
                <span>Reset Failed Attempts</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await superForceLogoutUserFn({ data: { userId: user.id } });
                    toast.success(`Security token refreshed for @${user.username}`);
                    onActionComplete?.();
                    onClose();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Refresh failed");
                  }
                }}
                className="p-3.5 rounded-xl border border-white/10 bg-white/[0.05] text-foreground hover:bg-white/10 font-bold text-xs flex flex-col items-center gap-1.5 transition-all"
              >
                <span className="text-lg">🔑</span>
                <span>Refresh Session</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border border-white/10 text-xs font-bold uppercase text-foreground hover:bg-white/[0.06]"
            >
              Close Menu
            </button>
          </div>
        )}

        {/* VIEW MODAL: Gameplay & Transaction Activity History */}
        {type === "view" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Wagers</span>
                <span className="text-sm font-black text-amber-400">{formatMoney(auditDetails?.totalBets ?? 0)}</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Wins</span>
                <span className="text-sm font-black text-emerald-400">{formatMoney(auditDetails?.totalWins ?? 0)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Activity & Betting Log</h4>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3 space-y-2 text-xs">
                {auditDetails?.recentLogs && auditDetails.recentLogs.length > 0 ? (
                  auditDetails.recentLogs.map((l) => (
                    <div key={l.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                      <div>
                        <div className="font-bold text-foreground">{l.action}</div>
                        <div className="text-[11px] text-muted-foreground">{l.summary}</div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">{new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-xs">No recent transaction or betting activity found.</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border border-white/10 text-xs font-bold uppercase text-foreground hover:bg-white/[0.06]"
            >
              Close Activity Log
            </button>
          </div>
        )}

        {/* PROFILE MODAL: Complete Player Account Details */}
        {type === "profile" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">User ID:</span>
                <span className="font-mono text-foreground font-bold">{user.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">Username:</span>
                <span className="font-bold text-foreground">@{user.username}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">Display Name:</span>
                <span className="font-bold text-amber-400">{user.displayName || "Not set"}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">Email:</span>
                <span className="text-foreground">{user.email || "No email assigned"}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">Role:</span>
                <span className="font-bold text-amber-300 uppercase">{user.role}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted-foreground font-semibold">Chip Balance:</span>
                <span className="font-bold text-emerald-400 text-sm">{formatMoney(user.balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Registration Date:</span>
                <span className="font-mono text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl bg-amber-500 text-xs font-black uppercase text-black hover:bg-amber-400"
            >
              Close Profile
            </button>
          </div>
        )}

        {/* SUSPICIOUS CHECK MODAL: Risk & Threat Inspection */}
        {type === "suspicious" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT PANEL: Risk & Security Posture Summary */}
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border text-center ${
                  auditDetails?.isSuspicious
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                }`}>
                  <div className="text-2xl mb-1">{auditDetails?.isSuspicious ? "⚠️" : "🛡️"}</div>
                  <div className="font-black text-sm uppercase tracking-wider">{auditDetails?.isSuspicious ? "Suspicious Risk Flagged" : "Clear Security Posture"}</div>
                  <div className="text-xs opacity-80 mt-1">{auditDetails?.statusText}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted-foreground">Large Payout Wins (≥ ₱10,000):</span>
                    <span className="font-bold text-amber-400">{auditDetails?.largeWinCount ?? 0} Occurrence(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted-foreground">Failed Login Attempts:</span>
                    <span className="font-bold text-foreground">{user.failedAttempts ?? 0} Attempt(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted-foreground">Lock State:</span>
                    <span className={`font-bold ${isLocked ? "text-rose-400" : "text-emerald-400"}`}>
                      {isLocked ? "LOCKED" : "UNLOCKED"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Player Net PnL (Wins - Bets):</span>
                    <span className={`font-bold ${(auditDetails?.netPnL ?? 0) >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {formatMoney(auditDetails?.netPnL ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: DataDog / CMD Console Terminal Style Audit Log */}
              <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-[#090b10] overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-500/20 bg-[#0e121a] px-3 py-2 text-[11px] font-mono text-emerald-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold tracking-wider uppercase">AUDIT_TRAIL.LOG</span>
                  </div>
                  <span className="text-[10px] text-emerald-500/70 font-mono">KodebyKarl Stream V1</span>
                </div>

                <div className="p-3 font-mono text-[11px] text-emerald-400/90 leading-relaxed overflow-y-auto max-h-[280px] min-h-[240px] space-y-2 bg-[#05070a]">
                  {auditDetails?.recentLogs && auditDetails.recentLogs.length > 0 ? (
                    auditDetails.recentLogs.map((log) => (
                      <div key={log.id} className="border-b border-emerald-500/10 pb-1.5 hover:bg-emerald-500/[0.03]">
                        <div className="flex items-center gap-2 text-[10px] text-emerald-500/60">
                          <span>[{new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}]</span>
                          <span className="text-amber-400 font-bold">[{log.action}]</span>
                        </div>
                        <div className="text-emerald-300 font-mono pl-2">
                          <span className="text-emerald-500 font-bold">$ </span>{log.summary}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-emerald-500/50 py-8 text-center font-mono">
                      [SYS_LOG] No audit trail events recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold uppercase text-rose-300 hover:bg-rose-500/20"
            >
              Close Risk Inspection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
