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
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, X, KeyRound, ShieldAlert, UserPlus, RefreshCw, Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user, isReady } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [showAddModal, setShowAddModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: "menu" | "view" | "edit" | "password" | "security";
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

  async function adjustBalance(userId: string, delta: number) {
    setBusyId(userId);
    try {
      await adminAdjustBalanceFn({ data: { userId, delta, note: delta > 0 ? "Admin credit" : "Admin debit" } });
      toast.success(delta > 0 ? "Balance credited" : "Balance deducted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Balance adjustment failed");
    } finally {
      setBusyId(null);
    }
  }

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
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Player List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage player accounts, security status, reset passwords, and adjust balances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-md"
        >
          <UserPlus size={18} />
          <span>+ Add Account</span>
        </button>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username or email…"
            className="h-11 min-w-[200px] max-w-xs rounded-xl border-border bg-panel text-foreground"
          />

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

          <button
            type="button"
            onClick={() => setMyPlayersOnly(!myPlayersOnly)}
            className={`h-11 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wider transition-all ${
              myPlayersOnly
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400/50"
                : "border border-border bg-panel text-muted-foreground hover:bg-panel-hover hover:text-foreground"
            }`}
          >
            🎯 My Players Only {myPlayersOnly ? "✓" : ""}
          </button>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 h-11 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-foreground hover:bg-panel-hover"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm">
        <table className="w-full text-left text-sm border-collapse min-w-[900px]">
          <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3.5 font-semibold">User</th>
              <th className="px-4 py-3.5 font-semibold text-center">Created By / Agent</th>
              <th className="px-4 py-3.5 font-semibold text-center">Role</th>
              <th className="px-4 py-3.5 font-semibold text-center">Balance</th>
              <th className="px-4 py-3.5 font-semibold text-center">Actions Grid</th>
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
                          onClick={() => setActiveModal({ type: "menu", user: u })}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                        >
                          Menu
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "view", user: u })}
                          className="rounded-xl border border-border bg-panel-hover px-3 py-1.5 text-foreground hover:bg-border active:scale-95 transition-all"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "edit", user: u })}
                          className="rounded-xl border border-border bg-panel-hover px-3 py-1.5 text-foreground hover:bg-border active:scale-95 transition-all"
                        >
                          Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "edit", user: u })}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(u.id);
                            toast.success(`Copied ID for @${u.username}`);
                          }}
                          className="rounded-xl border border-border bg-panel-hover px-3 py-1.5 text-foreground hover:bg-border active:scale-95 transition-all"
                        >
                          Copy ID
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: "password", user: u })}
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
                          disabled={busyId === u.id}
                          onClick={() => void toggleLock(u.id, locked)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                            locked
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          }`}
                        >
                          {locked ? "Unlock" : "Lock"}
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
          onSuccess={() => {
            setShowAddModal(false);
            void load();
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
    </div>
  );
}

/** Modal to create new Player or Agent accounts */
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("0");
  const [role, setRole] = useState<UserRole>("player");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Username and password are required");
      return;
    }
    setSubmitting(true);
    try {
      await adminCreateUserFn({
        data: {
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
          password,
          balance: Number(balance) || 0,
          role,
        },
      });
      toast.success(`Account @${username.trim()} created successfully!`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-lg font-bold text-foreground">Create New Account</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
            >
              <option value="player">Player</option>
              <option value="agent">Agent</option>
              <option value="master_agent">Master Agent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Username *</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. player88"
              required
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

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
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Email (Optional)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Initial Balance (₱)</label>
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
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
  onSelect: (modalType: "view" | "edit" | "password" | "security") => void;
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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground">Reset Password — @{user.username}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-panel-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">New Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              required
              minLength={6}
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
              className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? "Resetting…" : "Set New Password"}
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
