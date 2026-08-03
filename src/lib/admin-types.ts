/** Shared admin portal types (safe for client + server). */

export type AdminDashboardStats = {
  totalUsers: number;
  totalPlayers: number;
  totalAdmins: number;
  totalBets: number;
  betVolume: number;
  winVolume: number;
  netEarnings: number;
  biggestWin24h: number;
  liveWins24h: number;
  agentBalance: number;
  agentUsername: string;
  agentRole: string;
  labels: {
    totalUsers: string;
    totalPlayers: string;
    totalAdmins: string;
    totalBets: string;
    betVolume: string;
    winVolume: string;
    netEarnings: string;
    biggestWin24h: string;
    liveWins24h: string;
    agentBalance: string;
  };
};

import type { UserRole } from "./user";

export type AdminUserRow = {
  id: string;
  publicUserId: string;
  email: string | null;
  username: string;
  balance: number;
  role: UserRole;
  displayName: string | null;
  avatarUrl: string | null;
  isLocked?: boolean;
  failedAttempts?: number;
  createdAt: string;
  agentName?: string | null;
  parentAgentId?: string | null;
};

export type AdminAuditLogRow = {
  id: string;
  actorId: string | null;
  actorUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  meta: string | null;
  createdAt: string;
};

/** Precise player wallet / game ledger row for admin audit. */
export type AdminTransactionRow = {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  type: "deposit" | "withdraw" | "bet" | "win" | "adjust" | "jackpot";
  /** Signed amount: bets usually negative, wins positive */
  amount: number;
  /** Absolute stake / payout for display */
  absAmount: number;
  balanceAfter: number;
  game: string | null;
  note: string | null;
  /** Human label: Win | Bet/Loss | Credit | Debit | … */
  label: string;
  createdAt: string;
};

/** Win/Lose summary totals for Reports. */
export type WinLoseSummary = {
  betVolume: number;
  winVolume: number;
  net: number;
  depositVolume: number;
  withdrawVolume: number;
  betCount: number;
  winCount: number;
};

/** Per-player (account level) win/lose. */
export type WinLoseByLevelRow = {
  userId: string;
  username: string;
  role: UserRole;
  betVolume: number;
  winVolume: number;
  net: number;
  betCount: number;
  winCount: number;
};

/** Per-product (game) win/lose. */
export type WinLoseByProductRow = {
  product: string;
  betVolume: number;
  winVolume: number;
  net: number;
  betCount: number;
  winCount: number;
};

/** Per-day platform pulse for the clickable week strip. */
export type AdminDayPulse = {
  /** 0=Mon … 6=Sun */
  dayIndex: number;
  label: string;
  dateKey: string;
  dateLabel: string;
  bets: number;
  wins: number;
  betVolume: number;
  winVolume: number;
  sessions: number;
  playersActive: number;
  labels: {
    bets: string;
    wins: string;
    betVolume: string;
    winVolume: string;
    sessions: string;
    playersActive: string;
  };
};
