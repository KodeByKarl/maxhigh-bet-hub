import {
  mysqlTable,
  varchar,
  decimal,
  timestamp,
  mysqlEnum,
  text,
  index,
  bigint,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    /** Globally unique public account code (distinct from UUID primary key). */
    publicUserId: varchar("public_user_id", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    /** Wallet balance stored as decimal string, e.g. "1284.50" */
    balance: decimal("balance", { precision: 14, scale: 2 }).notNull().default("0.00"),
    role: mysqlEnum("role", ["player", "admin", "agent", "master_agent", "superadmin"]).notNull().default("player"),
    isLocked: mysqlEnum("is_locked", ["yes", "no"]).notNull().default("no"),
    failedAttempts: bigint("failed_attempts", { mode: "number" }).notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lockedAt: timestamp("locked_at"),
    lockedBy: varchar("locked_by", { length: 36 }),
    lockReason: text("lock_reason"),
    unlockedAt: timestamp("unlocked_at"),
    unlockedBy: varchar("unlocked_by", { length: 36 }),
    displayName: varchar("display_name", { length: 128 }),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    parentAgentId: varchar("upline_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_username_idx").on(t.username),
    index("users_public_user_id_idx").on(t.publicUserId),
    index("users_upline_idx").on(t.parentAgentId),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    /** Last activity — used for accurate Players Online (active in last few minutes). */
    lastSeenAt: timestamp("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
    index("sessions_last_seen_idx").on(t.lastSeenAt),
  ],
);

export const jackpot = mysqlTable("jackpot", {
  id: varchar("id", { length: 32 }).primaryKey().default("mega"),
  amount: decimal("amount", { precision: 16, scale: 2 }).notNull().default("0.00"),
  /** When "no", Mega Jackpot win condition never triggers. */
  enabled: mysqlEnum("enabled", ["yes", "no"]).notNull().default("yes"),
  /**
   * Cosmetic Ultra Mega Jackpot display amount for the Player Board.
   * Not tied to win/payout logic.
   */
  displayAmount: decimal("display_amount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const transactions = mysqlTable(
  "transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["deposit", "withdraw", "bet", "win", "adjust", "jackpot"]).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    balanceAfter: decimal("balance_after", { precision: 14, scale: 2 }).notNull(),
    /** Game / source label, e.g. "Candy Peak" */
    game: varchar("game", { length: 64 }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("tx_user_idx").on(t.userId),
    index("tx_created_idx").on(t.createdAt),
    index("tx_type_idx").on(t.type),
    index("tx_game_idx").on(t.game),
  ],
);

export const liveWins = mysqlTable(
  "live_wins",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    username: varchar("username", { length: 64 }).notNull(),
    game: varchar("game", { length: 64 }).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("live_wins_created_idx").on(t.createdAt)],
);

/** Player deposit / withdraw requests awaiting Superadmin approval. */
export const walletRequests = mysqlTable(
  "wallet_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["deposit", "withdraw"]).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    playerNote: text("player_note"),
    staffNote: text("staff_note"),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("wr_status_idx").on(t.status),
    index("wr_user_idx").on(t.userId),
    index("wr_created_idx").on(t.createdAt),
  ],
);

/** Admin / staff action history (Domain 2 / 3). */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    actorUsername: varchar("actor_username", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 64 }),
    summary: varchar("summary", { length: 512 }).notNull(),
    meta: text("meta"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_actor_idx").on(t.actorId),
    index("audit_action_idx").on(t.action),
  ],
);

/**
 * Domain 3 game controls — overlays the static catalog in src/lib/games.ts.
 * Superadmin can enable/disable and tune display fields.
 */
export const gameControls = mysqlTable(
  "game_controls",
  {
    gameId: varchar("game_id", { length: 64 }).primaryKey(),
    enabled: mysqlEnum("enabled", ["yes", "no"]).notNull().default("yes"),
    featured: mysqlEnum("featured", ["yes", "no"]).notNull().default("no"),
    sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
    tag: varchar("tag", { length: 32 }),
    rtp: varchar("rtp", { length: 32 }),
    volatility: varchar("volatility", { length: 32 }),
    minBet: varchar("min_bet", { length: 32 }),
    maxBet: varchar("max_bet", { length: 32 }),
    notes: text("notes"),
    /** JSON math/engine config (Candy Peak etc.) */
    engineConfig: text("engine_config"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (t) => [index("game_controls_enabled_idx").on(t.enabled)],
);

/** Audit history for superadmin bulk game outcome controls */
export const gameSettingsLogs = mysqlTable(
  "game_settings_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    actorUsername: varchar("actor_username", { length: 64 }).notNull(),
    scope: varchar("scope", { length: 64 }).notNull(),
    affectedCount: bigint("affected_count", { mode: "number" }).notNull().default(0),
    deadSpinPct: decimal("dead_spin_pct", { precision: 5, scale: 2 }).notNull(),
    winChancePct: decimal("win_chance_pct", { precision: 5, scale: 2 }).notNull(),
    maxMultiplier: decimal("max_multiplier", { precision: 10, scale: 2 }).notNull(),
    rtp: decimal("rtp", { precision: 5, scale: 2 }).notNull(),
    beforeSnapshot: text("before_snapshot"),
    afterSnapshot: text("after_snapshot"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("gsl_created_idx").on(t.createdAt),
    index("gsl_actor_idx").on(t.actorId),
  ],
);

/**
 * Server-authoritative in-progress game sessions (e.g. Candy Peak free spins).
 * Wins are credited only by the game settle path — never by client delta.
 */
export const playSessions = mysqlTable(
  "play_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: varchar("game_id", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["open", "closed"]).notNull().default("open"),
    bet: decimal("bet", { precision: 14, scale: 2 }).notNull(),
    ante: mysqlEnum("ante", ["yes", "no"]).notNull().default("no"),
    freeSpinsLeft: bigint("free_spins_left", { mode: "number" }).notNull().default(0),
    fsSessionWin: decimal("fs_session_win", { precision: 14, scale: 2 }).notNull().default("0.00"),
    fsBombAcc: decimal("fs_bomb_acc", { precision: 14, scale: 2 }).notNull().default("0.00"),
    fsSpinsPlayed: bigint("fs_spins_played", { mode: "number" }).notNull().default(0),
    featureState: text("feature_state"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (t) => [
    index("play_sessions_user_idx").on(t.userId),
    index("play_sessions_status_idx").on(t.status),
    index("play_sessions_user_game_status_idx").on(t.userId, t.gameId, t.status),
    /** Speeds D1 stale-close / closed purge by (status, updated_at). */
    index("play_sessions_status_updated_idx").on(t.status, t.updatedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type GameControl = typeof gameControls.$inferSelect;
export type WalletRequest = typeof walletRequests.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;

export const platformSettings = mysqlTable("platform_settings", {
  id: varchar("id", { length: 32 }).primaryKey().default("default"),
  maintenanceMode: mysqlEnum("maintenance_mode", ["yes", "no"]).notNull().default("no"),
  announcementBanner: text("announcement_banner"),
  minDeposit: decimal("min_deposit", { precision: 14, scale: 2 }).notNull().default("100.00"),
  maxDeposit: decimal("max_deposit", { precision: 14, scale: 2 }).notNull().default("50000.00"),
  minWithdraw: decimal("min_withdraw", { precision: 14, scale: 2 }).notNull().default("200.00"),
  maxWithdraw: decimal("max_withdraw", { precision: 14, scale: 2 }).notNull().default("100000.00"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const carouselSlides = mysqlTable("carousel_slides", {
  id: varchar("id", { length: 36 }).primaryKey(),
  badge: varchar("badge", { length: 64 }).notNull().default("Promo"),
  title: varchar("title", { length: 128 }).notNull(),
  headline: varchar("headline", { length: 128 }).notNull(),
  sub: varchar("sub", { length: 255 }),
  cta: varchar("cta", { length: 64 }).notNull().default("Claim Now"),
  linkUrl: varchar("link_url", { length: 512 }),
  imageUrl: varchar("image_url", { length: 512 }).notNull(),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  enabled: mysqlEnum("enabled", ["yes", "no"]).notNull().default("yes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const promotions = mysqlTable("promotions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  description: text("description"),
  bonusPercent: decimal("bonus_percent", { precision: 6, scale: 2 }).notNull().default("100.00"),
  maxBonus: decimal("max_bonus", { precision: 14, scale: 2 }).notNull().default("1000.00"),
  wageringMultiplier: decimal("wagering_multiplier", { precision: 6, scale: 2 }).notNull().default("15.00"),
  enabled: mysqlEnum("enabled", ["yes", "no"]).notNull().default("yes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const riskControls = mysqlTable("risk_controls", {
  id: varchar("id", { length: 32 }).primaryKey().default("default"),
  maxSingleBet: decimal("max_single_bet", { precision: 14, scale: 2 }).notNull().default("10000.00"),
  maxDailyPayout: decimal("max_daily_payout", { precision: 14, scale: 2 }).notNull().default("500000.00"),
  maxWeeklyLimit: decimal("max_weekly_limit", { precision: 14, scale: 2 }).notNull().default("20000.00"),
  autoFlagLargeWins: mysqlEnum("auto_flag_large_wins", ["yes", "no"]).notNull().default("yes"),
  largeWinThreshold: decimal("large_win_threshold", { precision: 14, scale: 2 }).notNull().default("50000.00"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

/** Support Ticket for live chat conversations. */
export const supportTickets = mysqlTable(
  "support_tickets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 64 }).notNull(),
    playerName: varchar("player_name", { length: 128 }),
    concern: text("concern"),
    agentName: varchar("agent_name", { length: 128 }),
    status: mysqlEnum("status", ["open", "resolved"]).notNull().default("open"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (t) => [
    index("st_user_idx").on(t.userId),
    index("st_status_idx").on(t.status),
  ],
);

/** Support Message inside a ticket conversation. */
export const supportMessages = mysqlTable(
  "support_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ticketId: varchar("ticket_id", { length: 36 })
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    sender: mysqlEnum("sender", ["user", "agent"]).notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("sm_ticket_idx").on(t.ticketId),
    index("sm_created_idx").on(t.createdAt),
  ],
);

export const provablyFairSeeds = mysqlTable(
  "provably_fair_seeds",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serverSeed: varchar("server_seed", { length: 128 }).notNull(),
    serverSeedHash: varchar("server_seed_hash", { length: 128 }).notNull(),
    clientSeed: varchar("client_seed", { length: 128 }).notNull(),
    nonce: bigint("nonce", { mode: "number" }).notNull().default(0),
    status: mysqlEnum("status", ["active", "revealed"]).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (t) => [
    index("pfs_user_idx").on(t.userId),
    index("pfs_status_idx").on(t.status),
  ],
);

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type CarouselSlide = typeof carouselSlides.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type RiskControl = typeof riskControls.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type ProvablyFairSeed = typeof provablyFairSeeds.$inferSelect;

