import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listSuperUsersFn,
  superCreateUserFn,
  superSetUserRoleFn,
  superAdjustBalanceFn,
  superGetUserSecurityDetailsFn,
  superToggleLockUserFn,
  superForceLogoutUserFn,
} from "@/functions/superadmin";
import type { SuperUserRow } from "@/lib/superadmin-types";
import type { UserRole } from "@/lib/user";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";
import { MoreHorizontal, X } from "lucide-react";

export const Route = createFileRoute("/superadmin/admins")({
  component: SuperAdminsPage,
});

function SuperAdminsPage() {
  const { user, isReady } = useAuth();
  const [users, setUsers] = useState<SuperUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    type: "menu" | "view" | "profile" | "addChips" | "copy" | "security" | "suspicious";
    user: SuperUserRow;
  } | null>(null);

  const load = useCallback(async () => {
    const data = await listSuperUsersFn({ data: { limit: 300 } });
    const staff = data.filter((u) => u.role !== "player");
    setUsers(staff);
  }, []);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => setUsers([]));
  }, [isReady, user, load]);

  const filteredRows = useMemo(() => {
    return users.filter((u) => {
      const matchQ =
        !q ||
        u.username.toLowerCase().includes(q.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(q.toLowerCase())) ||
        (u.displayName && u.displayName.toLowerCase().includes(q.toLowerCase()));
      const matchRole = role === "all" || u.role === role;
      return matchQ && matchRole;
    });
  }, [users, q, role]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sortBy === "az") {
      return list.sort((a, b) => a.username.localeCompare(b.username));
    }
    if (sortBy === "za") {
      return list.sort((a, b) => b.username.localeCompare(a.username));
    }
    return list;
  }, [filteredRows, sortBy]);

  const setUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await superSetUserRoleFn({ data: { userId, role: newRole } });
      toast.success(`Role updated to ${newRole}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-3xl">
          <span className="sm:hidden">Admins</span>
          <span className="hidden sm:inline">Admin & Staff Management</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Manage Admin, Master Agent, and SuperAdmin accounts, permissions, and security details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username…"
          className="h-11 w-full rounded-xl border-amber-500/20 bg-white/[0.06] text-foreground sm:max-w-xs"
        />
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | "all")}
            className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm text-foreground [color-scheme:dark]"
          >
            <option value="all" className="bg-white text-stone-900">All Roles</option>
            <option value="agent" className="bg-white text-stone-900">Agent</option>
            <option value="master_agent" className="bg-white text-stone-900">Master Agent</option>
            <option value="superadmin" className="bg-white text-stone-900">SuperAdmin</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "az" | "za")}
            className="h-11 rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm font-bold text-amber-400 [color-scheme:dark]"
          >
            <option value="newest" className="bg-white text-stone-900">Newest → Oldest</option>
            <option value="oldest" className="bg-white text-stone-900">Oldest → Newest</option>
            <option value="az" className="bg-white text-stone-900">Alphabetical (A - Z)</option>
            <option value="za" className="bg-white text-stone-900">Alphabetical (Z - A)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <button
            type="button"
            onClick={() => void load()}
            className="h-11 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform"
          >
            + Add Agent
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 lg:hidden">
        {sortedRows.length === 0 ? (
          <div className={`${saGlass} p-8 text-center text-sm text-muted-foreground`}>No staff accounts found.</div>
        ) : (
          sortedRows.map((u) => (
            <div key={u.id} className={`${saGlass} space-y-3 p-3.5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-black text-foreground">@{u.username}</span>
                    {u.isLocked === "yes" ? (
                      <span className="shrink-0 rounded-md border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-300">
                        Locked
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  {u.displayName && (
                    <div className="mt-0.5 truncate text-[11px] text-amber-400">{u.displayName}</div>
                  )}
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    ID: {u.publicUserId || u.id.slice(0, 8)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Balance</div>
                  <div className="text-lg font-black tabular-nums text-emerald-400">{formatMoney(u.balance)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={u.role}
                  onChange={(e) => void setUserRole(u.id, e.target.value as UserRole)}
                  className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#161224] px-2 text-xs font-bold text-foreground [color-scheme:dark]"
                >
                  <option value="player">Player</option>
                  <option value="agent">Agent</option>
                  <option value="master_agent">Master Agent</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
                <div className="flex h-10 items-center truncate rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-bold text-amber-300">
                  {u.parentAgentUsername ? `@${u.parentAgentUsername}` : "No upline"}
                </div>
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
          ))
        )}
      </div>

      <div className={`${saGlass} hidden overflow-x-auto lg:block`}>
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground bg-white/[0.02]">
            <tr>
              <th className="w-[20%] px-4 py-3.5">Staff Account</th>
              <th className="w-[15%] px-4 py-3.5 text-center">Role</th>
              <th className="w-[15%] px-4 py-3.5 text-center">Balance</th>
              <th className="w-[50%] px-4 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                  No staff accounts found.
                </td>
              </tr>
            ) : (
              sortedRows.map((u) => (
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
                    {u.parentAgentUsername && (
                      <div className="text-[10px] text-amber-300/90 font-semibold truncate">
                        👑 Upline: @{u.parentAgentUsername}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                      ID: {u.publicUserId || u.id.slice(0, 8)}…
                    </div>
                  </td>

                  <td className="w-[15%] px-4 py-4 align-middle text-center">
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

                  <td className="w-[50%] px-4 py-4 align-middle">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveModal({ type: "addChips", user: u })}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/25"
                      >
                        Add / Withdraw
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal({ type: "view", user: u })}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-foreground hover:bg-white/10"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal({ type: "profile", user: u })}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-foreground hover:bg-white/10"
                      >
                        Profile
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            void load();
          }}
          existingUsernames={users.map((r) => r.username.toLowerCase())}
          masterAgents={users.filter((r) => r.role === "master_agent")}
        />
      )}

      {activeModal && (
        <StaffActionModal
          modal={activeModal}
          onClose={() => setActiveModal(null)}
          onActionComplete={() => void load()}
          onNavigate={(type) => setActiveModal({ type, user: activeModal.user })}
        />
      )}
    </div>
  );
}

function AddAdminModal({
  onClose,
  onCreated,
  existingUsernames,
  masterAgents,
}: {
  onClose: () => void;
  onCreated: () => void;
  existingUsernames: string[];
  masterAgents: SuperUserRow[];
}) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [publicUserId, setPublicUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("agent");
  const [displayName, setDisplayName] = useState("");
  const [parentAgentId, setParentAgentId] = useState<string>("");

  const isUsernameTaken = useMemo(() => {
    if (!username.trim()) return false;
    return existingUsernames.includes(username.trim().toLowerCase());
  }, [username, existingUsernames]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isUsernameTaken) {
      toast.error("Username already taken!");
      return;
    }
    setBusy(true);
    try {
      await superCreateUserFn({
        data: {
          username,
          publicUserId: publicUserId.trim() || undefined,
          password,
          role,
          displayName: displayName || undefined,
          balance: 0,
          parentAgentId: role === "agent" && parentAgentId ? parentAgentId : undefined,
        },
      });
      toast.success(`Account @${username} created!`);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`${saGlass} w-full max-w-lg space-y-4 p-6 border border-amber-500/30 shadow-2xl my-auto`}>
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div>
            <h2 className="text-xl font-black text-foreground">+ Add Agent / Staff Account</h2>
            <p className="text-xs text-muted-foreground">Create a new Agent, Master Agent, or SuperAdmin account.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. agent_john"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
            {isUsernameTaken && <div className="mt-1 text-[11px] font-semibold text-rose-400">❌ Username already taken!</div>}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
              User ID (optional)
            </label>
            <Input
              value={publicUserId}
              onChange={(e) => setPublicUserId(e.target.value)}
              placeholder="Defaults to username if empty"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Display Name (Optional)</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              placeholder="Min 6 characters"
              className="h-10 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm font-bold text-foreground [color-scheme:dark]"
            >
              <option value="agent">Agent</option>
              <option value="master_agent">Master Agent</option>
              <option value="superadmin">SuperAdmin</option>
            </select>
          </div>

          {role === "agent" && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Upline Master Agent (Optional)</label>
              <select
                value={parentAgentId}
                onChange={(e) => setParentAgentId(e.target.value)}
                className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#1C1916] px-3 text-sm text-foreground [color-scheme:dark]"
              >
                <option value="">Direct SuperAdmin Agent (No Upline)</option>
                {masterAgents.map((ma) => (
                  <option key={ma.id} value={ma.id}>
                    @{ma.username} {ma.displayName ? `(${ma.displayName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-amber-500/25 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]">
              Cancel
            </button>
            <button type="submit" disabled={busy || isUsernameTaken} className="h-10 rounded-xl bg-amber-500 px-5 text-sm font-bold text-black disabled:opacity-60">
              {busy ? "Creating…" : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffActionModal({
  modal,
  onClose,
  onActionComplete,
  onNavigate,
}: {
  modal: {
    type: "menu" | "view" | "profile" | "addChips" | "copy" | "security" | "suspicious";
    user: SuperUserRow;
  };
  onClose: () => void;
  onActionComplete?: () => void;
  onNavigate?: (type: "menu" | "view" | "profile" | "addChips" | "copy" | "security" | "suspicious") => void;
}) {
  const { user, type } = modal;
  const [isLocked, setIsLocked] = useState(user.isLocked === "yes");
  const [chipAmount, setChipAmount] = useState("10000");
  const [chipNote, setChipNote] = useState("");
  const [chipMode, setChipMode] = useState<"add" | "withdraw">("add");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
    void superGetUserSecurityDetailsFn({ data: { userId: user.id } })
      .then((res) => setAuditDetails(res))
      .catch(() => setAuditDetails(null));
  }, [user.id]);

  const handleAddChips = async (e: FormEvent) => {
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
    setBusy(true);
    try {
      await superAdjustBalanceFn({
        data: {
          userId: user.id,
          delta,
          confirmPassword,
          note:
            chipNote.trim() ||
            (chipMode === "add"
              ? "Superadmin chip credit (unlimited)"
              : "Superadmin chip withdrawal"),
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
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`${saGlass} w-full ${type === "suspicious" || type === "view" ? "max-w-4xl" : "max-w-xl"} space-y-4 p-6 border border-amber-500/30 shadow-2xl my-auto`}>
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div>
            <h2 className="text-xl font-black text-foreground">Staff Action · @{user.username}</h2>
            <p className="text-xs text-muted-foreground">Action type: <span className="text-amber-400 font-bold uppercase">{type}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06]">
            <X size={20} />
          </button>
        </div>

        {type === "addChips" && (
          <form onSubmit={handleAddChips} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChipMode("add")}
                className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
                  chipMode === "add"
                    ? "bg-emerald-500 text-black"
                    : "border border-white/10 text-muted-foreground hover:bg-white/[0.06]"
                }`}
              >
                Add Chips
              </button>
              <button
                type="button"
                onClick={() => setChipMode("withdraw")}
                className={`h-9 flex-1 rounded-lg text-xs font-black uppercase ${
                  chipMode === "withdraw"
                    ? "bg-rose-500 text-white"
                    : "border border-white/10 text-muted-foreground hover:bg-white/[0.06]"
                }`}
              >
                Withdraw
              </button>
            </div>
            <div className={`rounded-xl border p-3 text-xs ${
              chipMode === "add"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}>
              {chipMode === "add" ? (
                <>Superadmin can <span className="font-black">add unlimited</span> chips to this account.</>
              ) : (
                <>Withdraw chips from this account (balance cannot go below ₱0).</>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current balance: <span className="font-bold text-emerald-400">{formatMoney(user.balance)}</span>
            </p>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Chip Amount (₱)</label>
              <Input
                type="number"
                min={1}
                step="any"
                max={chipMode === "withdraw" ? user.balance : undefined}
                value={chipAmount}
                onChange={(e) => setChipAmount(e.target.value)}
                required
                className="h-10 bg-white/[0.06] text-foreground font-bold text-base"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Note (Optional)</label>
              <Input
                value={chipNote}
                onChange={(e) => setChipNote(e.target.value)}
                placeholder={chipMode === "add" ? "e.g. Weekly agent float" : "e.g. Recall unused chips"}
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
              disabled={busy}
              className={`h-11 w-full rounded-xl text-xs font-black uppercase disabled:opacity-60 ${
                chipMode === "add"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:brightness-110"
                  : "bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:brightness-110"
              }`}
            >
              {busy
                ? "Processing…"
                : chipMode === "add"
                  ? `Add ₱${Number(chipAmount || 0).toLocaleString("en-PH")} Chips`
                  : `Withdraw ₱${Number(chipAmount || 0).toLocaleString("en-PH")} Chips`}
            </button>
          </form>
        )}

        {/* MENU MODAL */}
        {type === "menu" && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs ${
              isLocked ? "border-rose-500/40 bg-rose-500/15 text-rose-300" : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            }`}>
              <span>Current Account Status:</span>
              <span className="font-black uppercase tracking-wider">{isLocked ? "🔒 LOCKED" : "🔓 UNLOCKED / ACTIVE"}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Manage <span className="font-bold text-amber-400">@{user.username}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { type: "view" as const, label: "View" },
                  { type: "profile" as const, label: "Profile" },
                  { type: "addChips" as const, label: "Add / Withdraw" },
                  { type: "copy" as const, label: "Copy ID" },
                  { type: "security" as const, label: "Security Code" },
                  { type: "suspicious" as const, label: "Risk Check" },
                ]
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onNavigate?.(item.type)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-bold text-foreground hover:bg-white/10"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Security controls</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await superToggleLockUserFn({
                      data: { userId: user.id, lock: !isLocked },
                    });
                    setIsLocked(res.isLocked === "yes");
                    toast.success(`Account @${res.username} ${res.isLocked === "yes" ? "Locked" : "Unlocked"}!`);
                    onActionComplete?.();
                  } catch (e) {
                    toast.error("Action failed");
                  }
                }}
                className={`p-3.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1.5 ${
                  isLocked ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-rose-500/40 bg-rose-500/10 text-rose-400"
                }`}
              >
                <span className="text-lg">{isLocked ? "🔓" : "🔒"}</span>
                <span>{isLocked ? "Unlock Account" : "Lock Account"}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await superForceLogoutUserFn({ data: { userId: user.id } });
                    toast.info(`Active sessions terminated for @${user.username}`);
                    onActionComplete?.();
                    onClose();
                  } catch {
                    toast.error("Logout failed");
                  }
                }}
                className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-xs flex flex-col items-center gap-1.5"
              >
                <span className="text-lg">🚫</span>
                <span>Force Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* SUSPICIOUS / RISK CHECK MODAL */}
        {type === "suspicious" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border text-center ${auditDetails?.isSuspicious ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>
                <div className="text-2xl mb-1">{auditDetails?.isSuspicious ? "⚠️" : "🛡️"}</div>
                <div className="font-black text-sm uppercase tracking-wider">{auditDetails?.isSuspicious ? "Suspicious Risk Flagged" : "Clear Security Posture"}</div>
                <div className="text-xs opacity-80 mt-1">{auditDetails?.statusText}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-bold text-emerald-400">{formatMoney(user.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock State:</span>
                  <span className={`font-bold ${isLocked ? "text-rose-400" : "text-emerald-400"}`}>{isLocked ? "LOCKED" : "UNLOCKED"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-[#090b10] overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-500/20 bg-[#0e121a] px-3 py-2 text-[11px] font-mono text-emerald-400">
                <span className="font-bold tracking-wider uppercase">STAFF_AUDIT.LOG</span>
                <span className="text-[10px] text-emerald-500/70 font-mono">KodebyKarl Stream V1</span>
              </div>
              <div className="p-3 font-mono text-[11px] text-emerald-400/90 leading-relaxed overflow-y-auto max-h-[280px] min-h-[240px] space-y-2 bg-[#05070a]">
                {auditDetails?.recentLogs && auditDetails.recentLogs.length > 0 ? (
                  auditDetails.recentLogs.map((log) => (
                    <div key={log.id} className="border-b border-emerald-500/10 pb-1.5">
                      <div className="text-[10px] text-emerald-500/60">[{new Date(log.timestamp).toISOString().slice(0, 19)}] [{log.action}]</div>
                      <div className="text-emerald-300 pl-2">$ {log.summary}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-500/50 py-8 text-center font-mono">[SYS_LOG] No audit records found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE / VIEW / COPY MODALS */}
        {(type === "profile" || type === "view" || type === "copy") && (
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
              <span className="text-muted-foreground font-semibold">Role:</span>
              <span className="font-bold text-amber-300 uppercase">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Balance:</span>
              <span className="font-bold text-emerald-400 text-sm">{formatMoney(user.balance)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
