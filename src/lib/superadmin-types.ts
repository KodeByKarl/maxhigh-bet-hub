/** Shared Domain 3 superadmin types. */
import type { UserRole } from "@/lib/user";

export type SuperGameRow = {
  gameId: string;
  name: string;
  category: string;
  thumb: string;
  enabled: boolean;
  featured: boolean;
  sortOrder: number;
  tag: string | null;
  rtp: string | null;
  volatility: string | null;
  minBet: string | null;
  maxBet: string | null;
  notes: string | null;
  updatedAt: string | null;
};

export type SuperDashboard = {
  totalUsers: number;
  totalPlayers: number;
  totalAdmins: number;
  totalSuperadmins: number;
  gamesEnabled: number;
  gamesDisabled: number;
  totalBets: number;
  betVolume: number;
  winVolume: number;
  jackpot: number;
  labels: Record<string, string>;
};

export type SuperUserRow = {
  id: string;
  email: string | null;
  username: string;
  balance: number;
  role: UserRole;
  displayName: string | null;
  createdAt: string;
};

export type SuperWalletRequestRow = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  balance: number;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  playerNote: string | null;
  staffNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type PlatformSettingsData = {
  maintenanceMode: boolean;
  announcementBanner: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
};

export type PromotionRow = {
  id: string;
  code: string;
  description: string | null;
  bonusPercent: number;
  maxBonus: number;
  wageringMultiplier: number;
  enabled: boolean;
  createdAt: string;
};

export type RiskControlData = {
  maxSingleBet: number;
  maxDailyPayout: number;
  autoFlagLargeWins: boolean;
  largeWinThreshold: number;
};

