import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listAdminUsersFn,
  adminCreateUserFn,
  adminAdjustBalanceFn,
  adminToggleUserLockFn,
  adminUpdateUserFn,
  adminResetFailedAttemptsFn,
} from "@/functions/admin";
import type { AdminUserRow } from "@/lib/admin-types";
import type { UserRole } from "@/lib/user";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { AGENT_MASTER_PROMOTE_HINT } from "@/lib/agent-promotion";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, X, KeyRound, ShieldAlert, UserPlus, RefreshCw, Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user, isReady, refreshSession } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [showAddModal, setShowAddModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: "menu" | "view" | "edit" | "password" | "security" | "addChips";
    user: AdminUserRow;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listAdminUsersFn({ data: { q: q || undefined, limit: 200 } });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load player list");
      setRows([]);
    }
  }, [q]);

  const [myPlayersOnly, setMyPlayersOnly] = useState(false);

  const sortedRows = useMemo(() => {
    let filtered = [...rows];
    if (role !== "all") {
      filtered = filtered.filter((r) => r.role === role);
    }
    if (myPlayersOnly && user) {
      filtered = filtered.filter((r) => r.parentAgentId === user.id || r.agentName === (user.displayName || user.username));
    }
    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "az") return a.username.localeCompare(b.username);
      if (sortBy === "za") return b.username.localeCompare(a.username);
      return 0;
    });
  }, [rows, role, myPlayersOnly, user, sortBy]);

  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    void load();
  }, [isReady, user, load]);

  async function toggleLock(userId: string, currentlyLocked: boolean) {
    setBusyId(userId);
    try {
      await adminToggleUserLockFn({ data: { userId, lock: !currentlyLocked } });
      toast.success(currentlyLocked ? "Account unlocked" : "Account locked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lock update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground sm:text-3xl">Player List</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage accounts, security, passwords, and chips from your wallet.
          </p>
          {user && (user.role === "agent" || user.role === "master_agent") && (
            <p className="mt-1.5 text-xs font-semibold text-amber-300">
              Wallet: <span className="font-black text-emerald-400">{formatMoney(user.balance)}</span>
              <span className="hidden font-normal text-muted-foreground sm:inline"> — you can only give what you have</span>
            </p>
          )}
          {user?.role === "agent" && (
            <p className="mt-2 text-xs font-semibold text-violet-300">
              {AGENT_MASTER_PROMOTE_HINT}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username or email…"
          className="h-11 w-full rounded-xl border-border bg-panel text-foreground sm:min-w-[200px] sm:max-w-xs"
        />
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | "all")}
            className="h-11 rounded-xl border border-border bg-panel px-3 text-sm text-foreground [color-scheme:dark]"
          >
            <option value="all">All Roles</option>
            <option value="player">Player</option>
            <option value="agent">Agent</option>
            <option value="master_agent">Master Agent</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "az" | "za")}
            className="h-11 rounded-xl border border-border bg-panel px-3 text-sm font-semibold text-primary [color-scheme:dark]"
          >
            <option value="newest">Newest → Oldest</option>
            <option value="oldest">Oldest → Newest</option>
            <option value="az">Alphabetical (A - Z)</option>
            <option value="za">Alphabetical (Z - A)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <button
            type="button"
            onClick={() => setMyPlayersOnly(!myPlayersOnly)}
            className={`h-11 rounded-xl px-3 text-[11px] font-extrabold uppercase tracking-wider transition-all sm:px-4 sm:text-xs ${
              myPlayersOnly
                ? "border border-violet-400/50 bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                : "border border-border bg-panel text-muted-foreground hover:bg-panel-hover hover:text-foreground"
            }`}
          >
            My Players {myPlayersOnly ? "✓" : ""}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-foreground hover:bg-panel-hover"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 sm:w-auto"
        >
          <UserPlus size={18} />
          Add Account
        </button>
      </div>

      <div className="grid gap-2.5 md:hidden">
        {sortedRows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground">
            No users found matching your search.
          </div>
        ) : (
          sortedRows.map((u) => {
            const locked = u.isLocked || (u.failedAttempts ?? 0) >= 3;
            return (
              <div key={u.id} className="space-y-3 rounded-2xl border border-border bg-panel p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black text-foreground">@{u.username}</span>
                      {locked ? (
                        <span className="shrink-0 rounded-md border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-400">
                          Locked
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    {u.displayName && (
                      <div className="mt-0.5 truncate text-[11px] text-primary/90">{u.displayName}</div>
                    )}
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {u.publicUserId}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Balance</div>
                    <div className="text-lg font-black tabular-nums text-emerald-400">{formatMoney(u.balance)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-panel-hover px-2.5 py-1 font-black uppercase tracking-wider text-muted-foreground">
                    {u.role === "master_agent" ? "Master Agent" : u.role}
                  </span>
                  <span className="truncate rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-300">
                    @{u.agentName || "System"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: "addChips", user: u })}
                    className="h-10 rounded-xl bg-emerald-500/90 text-xs font-black uppercase tracking-wide text-black"
                  >
                    Add / Withdraw
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: "menu", user: u })}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-300"
                  >
                    <MoreHorizontal size={16} />
                    Actions
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm md:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3.5 font-semibold">User</th>
              <th className="px-4 py-3.5 font-semibold text-center">Created By / Agent</th>
              <th className="px-4 py-3.5 font-semibold text-center">Role</th>
              <th className="px-4 py-3.5 font-semibold text-center">Balance</th>
              <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              sortedRows.map((u) => {
                const locked = u.isLocked || (u.failedAttempts ?? 0) >= 3;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">@{u.username}</span>
                        {locked ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-400 uppercase tracking-wide shrink-0">
                            🔒 LOCKED ({u.failedAttempts ?? 3}/3)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wide shrink-0">
                            🟢 ACTIVE
                          </span>
                        )}
                      </div>
                      {u.displayName && (
                        <div className="text-xs text-primary/90 font-medium truncate">{u.displayName}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        User ID: {u.publicUserId}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email ?? "No email"}</div>
                    </td>

                    <td className="px-4 py-4 align-middle text-center">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">
                        🛡️ @{u.agentName || "System / Direct"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-middle text-center">
                      <span className="inline-block rounded-full bg-panel-hover px-3 py-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        {u.role === "master_agent" ? "Master Agent" : u.role}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-middle text-center font-black tabular-nums text-emerald-400 text-base">
                      {formatMoney(u.balance)}
                    </td>

                    <td className="w-[45%] px-4 py-4 align-middle">
                      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "addChips", user: u })}
                          className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/25"
                        >
                          Chips
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "view", user: u })}
                          className="rounded-xl border border-border bg-panel-hover px-3 py-1.5 text-foreground hover:bg-border"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "edit", user: u })}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void toggleLock(u.id, locked)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            locked
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          }`}
                        >
                          {locked ? "Unlock" : "Lock"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "menu", user: u })}
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20"
                        >
                          <MoreHorizontal size={14} />
                          Actions
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <CreateUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async (promoted) => {
            setShowAddModal(false);
            await load();
            if (promoted) await refreshSession();
          }}
        />
      )}

      {/* Active User Action Modals */}
      {activeModal?.type === "menu" && (
        <UserMenuModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onSelect={(modalType) => setActiveModal({ type: modalType, user: activeModal.user })}
        />
      )}

      {activeModal?.type === "view" && (
        <ViewUserModal user={activeModal.user} onClose={() => setActiveModal(null)} />
      )}

      {activeModal?.type === "edit" && (
        <EditProfileModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void load();
          }}
        />
      )}

      {activeModal?.type === "password" && (
        <ResetPasswordModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void load();
          }}
        />
      )}

      {activeModal?.type === "security" && (
        <SecurityDetailsModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void load();
          }}
        />
      )}

      {activeModal?.type === "addChips" && user && (
        <AddChipsModal
          target={activeModal.user}
          actorBalance={user.balance}
          actorRole={user.role}
          onClose={() => setActiveModal(null)}
          onSuccess={async () => {
            setActiveModal(null);
            await refreshSession();
            await load();
          }}
        />
      )}
    </div>
  );
}

/** Modal to create new Player or Agent accounts */
function AddChipsModal({
  target,
  actorBalance,
  actorRole,
  onClose,
  onSuccess,
}: {
  target: AdminUserRow;
  actorBalance: number;
  actorRole: UserRole;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("1000");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const unlimited = actorRole === "superadmin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error("Enter a valid chip amount");
      return;
    }
    if (mode === "add" && !unlimited && val > actorBalance) {
      toast.error(`You only have ₱${actorBalance.toLocaleString("en-PH")} chips available`);
      return;
    }
    if (mode === "withdraw" && val > target.balance) {
      toast.error(`@${target.username} only has ₱${target.balance.toLocaleString("en-PH")}`);
      return;
    }
    const delta = mode === "add" ? val : -val;
    setBusy(true);
    try {
      await adminAdjustBalanceFn({
        data: {
          userId: target.id,
          delta,
          note:
            note.trim() ||
            (mode === "add"
              ? `Chip transfer to @${target.username}`
              : `Chip withdrawal from @${target.username}`),
        },
      });
      toast.success(
        mode === "add"
          ? `Added ₱${val.toLocaleString("en-PH")} chips to @${target.username}`
          : `Withdrew ₱${val.toLocaleString("en-PH")} chips from @${target.username}`,
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-foreground">Manage Chips</h3>
            <p className="text-xs text-primary font-medium">@{target.username}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
              mode === "add" ? "bg-emerald-500 text-black" : "border border-border text-muted-foreground"
            }`}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
              mode === "withdraw" ? "bg-rose-500 text-white" : "border border-border text-muted-foreground"
            }`}
          >
            Withdraw
          </button>
        </div>

        <div className={`rounded-xl border p-3 text-xs ${
          mode === "add"
            ? unlimited
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/30 bg-rose-500/10 text-rose-200"
        }`}>
          {mode === "add" ? (
            unlimited ? (
              <>Superadmin credit is <span className="font-black">unlimited</span>.</>
            ) : (
              <>
                Your wallet: <span className="font-black">{formatMoney(actorBalance)}</span>
                <div className="mt-1 text-muted-foreground">Chips leave your wallet and go to the target.</div>
              </>
            )
          ) : (
            <>
              Withdraw chips from <span className="font-black">@{target.username}</span>
              {!unlimited && (
                <div className="mt-1 text-muted-foreground">Withdrawn chips return to your wallet.</div>
              )}
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Target balance: <span className="font-bold text-emerald-400">{formatMoney(target.balance)}</span>
        </p>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Chip Amount (₱)</label>
          <Input
            type="number"
            min={1}
            step="any"
            max={mode === "withdraw" ? target.balance : unlimited ? undefined : actorBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-11 font-bold"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Note (Optional)</label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "add" ? "e.g. Reload for weekend play" : "e.g. Collect unused chips"}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className={`h-11 w-full rounded-xl text-sm font-black uppercase disabled:opacity-50 ${
            mode === "add"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-rose-500 text-white hover:bg-rose-600"
          }`}
        >
          {busy
            ? "Processing…"
            : mode === "add"
              ? `Add ₱${Number(amount || 0).toLocaleString("en-PH")} Chips`
              : `Withdraw ₱${Number(amount || 0).toLocaleString("en-PH")} Chips`}
        </button>
      </form>
    </div>
  );
}

function actorRoleLabel(role?: string) {
  if (role === "master_agent") return "Master Agent";
  if (role === "agent") return "Agent";
  if (role === "superadmin") return "Superadmin";
  return "Admin";
}

/** Modal to create new Player or Agent accounts */
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (promoted: boolean) => void }) {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const canCreateAgent = user?.role === "agent" || user?.role === "master_agent" || isSuper;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [balance, setBalance] = useState("0");
  const [role, setRole] = useState<UserRole>("player");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Username and password are required");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const createRole: UserRole = isSuper
        ? role
        : canCreateAgent
          ? role === "agent"
            ? "agent"
            : "player"
          : "player";
      const created = await adminCreateUserFn({
        data: {
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          balance: Number(balance) || 0,
          role: createRole,
        },
      });
      if (created.agentPromoted) {
        toast.success(
          `Agent @${username.trim()} created. You earned Master Agent!`,
        );
      } else {
        toast.success(`Account @${username.trim()} created successfully!`);
      }
      onSuccess(Boolean(created.agentPromoted));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[min(92dvh,calc(100dvh-3.5rem))] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border border-border bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-lg font-bold text-foreground">Create New Account</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Agent account</div>
            <div className="mt-0.5 truncate text-sm font-black text-foreground">
              @{user?.username ?? "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {actorRoleLabel(user?.role)} — new accounts are created under this downline
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Account Role</label>
            {isSuper ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              >
                <option value="player">Player</option>
                <option value="agent">Agent</option>
                <option value="master_agent">Master Agent</option>
              </select>
            ) : canCreateAgent ? (
              <>
                <select
                  value={role === "agent" ? "agent" : "player"}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
                >
                  <option value="player">Player</option>
                  <option value="agent">Agent</option>
                </select>
                {user?.role === "agent" && (
                  <p className="mt-1.5 text-[11px] text-violet-300">{AGENT_MASTER_PROMOTE_HINT}</p>
                )}
              </>
            ) : (
              <div className="flex h-11 items-center rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
                Player
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Username *</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. player88"
              required
              autoComplete="off"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Email (Optional)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Password *</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Confirm Password *</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border bg-background"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="mt-1 text-[11px] font-semibold text-rose-400">Passwords do not match</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Initial Balance (₱)</label>
            <Input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              min={0}
              step="any"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground hover:bg-panel-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Action Menu Modal for a user */
function UserMenuModal({
  user,
  onClose,
  onSelect,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSelect: (modalType: "view" | "edit" | "password" | "security" | "addChips") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-foreground">Account Actions</h3>
            <p className="text-xs text-primary font-medium">@{user.username}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onSelect("addChips")}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <span>Add / Withdraw Chips</span>
            <span className="text-xs text-emerald-400/70">→</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("view")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background p-3 text-left text-sm font-semibold hover:bg-panel-hover transition-colors"
          >
            <span>View Full Details & Ledger</span>
            <span className="text-xs text-muted-foreground">→</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("edit")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background p-3 text-left text-sm font-semibold hover:bg-panel-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <Pencil size={16} className="text-primary" />
              <span>Edit Profile & Email</span>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("password")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background p-3 text-left text-sm font-semibold hover:bg-panel-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-amber-400" />
              <span>Reset Password</span>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("security")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background p-3 text-left text-sm font-semibold hover:bg-panel-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400" />
              <span>Security & Unlock Status</span>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-panel-hover mt-3"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** View User Details Modal */
function ViewUserModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground">Player Profile Details</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Username</span>
            <span className="font-bold text-foreground">@{user.username}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Display Name</span>
            <span className="font-semibold text-primary">{user.displayName ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{user.email ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Role</span>
            <span className="font-bold uppercase text-primary">{user.role}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-black text-emerald-400">{formatMoney(user.balance)}</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Security Status</span>
            <span className={`font-bold ${user.isLocked ? "text-rose-400" : "text-emerald-400"}`}>
              {user.isLocked ? "LOCKED" : "ACTIVE"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registered Date</span>
            <span className="text-muted-foreground">{new Date(user.createdAt).toLocaleString("en-PH")}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** Edit Profile Modal */
function EditProfileModal({ user, onClose, onSuccess }: { user: AdminUserRow; onClose: () => void; onSuccess: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminUpdateUserFn({
        data: {
          userId: user.id,
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      toast.success("Profile updated successfully");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground">Edit Profile — @{user.username}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-panel-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Reset Password Modal */
function ResetPasswordModal({ user, onClose, onSuccess }: { user: AdminUserRow; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await adminUpdateUserFn({
        data: {
          userId: user.id,
          password,
        },
      });
      toast.success(`Password reset for @${user.username}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-4 rounded-t-2xl border border-border bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground">Reset Password — @{user.username}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">New Password *</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Confirm Password *</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border bg-background"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="mt-1 text-[11px] font-semibold text-rose-400">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-panel-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Security Details Modal */
function SecurityDetailsModal({ user, onClose, onSuccess }: { user: AdminUserRow; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleResetSecurity() {
    setSubmitting(true);
    try {
      await adminResetFailedAttemptsFn({ data: { userId: user.id } });
      toast.success(`Security failed attempts reset for @${user.username}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground">Security Details — @{user.username}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Account Status</span>
            <span className={`font-bold ${user.isLocked ? "text-rose-400" : "text-emerald-400"}`}>
              {user.isLocked ? "🔒 LOCKED" : "🟢 ACTIVE"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Failed Login Attempts</span>
            <span className="font-mono font-bold text-foreground">{user.failedAttempts ?? 0} / 3</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleResetSecurity()}
            className="w-full h-11 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-sm font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            Reset Failed Attempts & Unlock
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-panel-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
