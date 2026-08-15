CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`actor_username` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`target_type` varchar(64),
	`target_id` varchar(64),
	`summary` varchar(512) NOT NULL,
	`meta` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carousel_slides` (
	`id` varchar(36) NOT NULL,
	`badge` varchar(64) NOT NULL DEFAULT 'Promo',
	`title` varchar(128) NOT NULL,
	`headline` varchar(128) NOT NULL,
	`sub` varchar(255),
	`cta` varchar(64) NOT NULL DEFAULT 'Claim Now',
	`link_url` varchar(512),
	`image_url` varchar(512) NOT NULL,
	`sort_order` bigint NOT NULL DEFAULT 0,
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `carousel_slides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_controls` (
	`game_id` varchar(64) NOT NULL,
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`featured` enum('yes','no') NOT NULL DEFAULT 'no',
	`sort_order` bigint NOT NULL DEFAULT 0,
	`tag` varchar(32),
	`rtp` varchar(32),
	`volatility` varchar(32),
	`min_bet` varchar(32),
	`max_bet` varchar(32),
	`notes` text,
	`engine_config` text,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_controls_game_id` PRIMARY KEY(`game_id`)
);
--> statement-breakpoint
CREATE TABLE `game_settings_logs` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`actor_username` varchar(64) NOT NULL,
	`scope` varchar(64) NOT NULL,
	`affected_count` bigint NOT NULL DEFAULT 0,
	`dead_spin_pct` decimal(5,2) NOT NULL,
	`win_chance_pct` decimal(5,2) NOT NULL,
	`max_multiplier` decimal(10,2) NOT NULL,
	`rtp` decimal(5,2) NOT NULL,
	`before_snapshot` text,
	`after_snapshot` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `game_settings_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jackpot` (
	`id` varchar(32) NOT NULL DEFAULT 'mega',
	`amount` decimal(16,2) NOT NULL DEFAULT '0.00',
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`display_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jackpot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_wins` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36),
	`username` varchar(64) NOT NULL,
	`game` varchar(64) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `live_wins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` varchar(32) NOT NULL DEFAULT 'default',
	`maintenance_mode` enum('yes','no') NOT NULL DEFAULT 'no',
	`announcement_banner` text,
	`min_deposit` decimal(14,2) NOT NULL DEFAULT '100.00',
	`max_deposit` decimal(14,2) NOT NULL DEFAULT '50000.00',
	`min_withdraw` decimal(14,2) NOT NULL DEFAULT '200.00',
	`max_withdraw` decimal(14,2) NOT NULL DEFAULT '100000.00',
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `play_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`game_id` varchar(64) NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`bet` decimal(14,2) NOT NULL,
	`ante` enum('yes','no') NOT NULL DEFAULT 'no',
	`free_spins_left` bigint NOT NULL DEFAULT 0,
	`fs_session_win` decimal(14,2) NOT NULL DEFAULT '0.00',
	`fs_bomb_acc` decimal(14,2) NOT NULL DEFAULT '0.00',
	`fs_spins_played` bigint NOT NULL DEFAULT 0,
	`feature_state` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `play_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` text,
	`bonus_percent` decimal(6,2) NOT NULL DEFAULT '100.00',
	`max_bonus` decimal(14,2) NOT NULL DEFAULT '1000.00',
	`wagering_multiplier` decimal(6,2) NOT NULL DEFAULT '15.00',
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `provably_fair_seeds` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`server_seed` varchar(128) NOT NULL,
	`server_seed_hash` varchar(128) NOT NULL,
	`client_seed` varchar(128) NOT NULL,
	`nonce` bigint NOT NULL DEFAULT 0,
	`status` enum('active','revealed') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provably_fair_seeds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_controls` (
	`id` varchar(32) NOT NULL DEFAULT 'default',
	`max_single_bet` decimal(14,2) NOT NULL DEFAULT '10000.00',
	`max_daily_payout` decimal(14,2) NOT NULL DEFAULT '500000.00',
	`max_weekly_limit` decimal(14,2) NOT NULL DEFAULT '20000.00',
	`auto_flag_large_wins` enum('yes','no') NOT NULL DEFAULT 'yes',
	`large_win_threshold` decimal(14,2) NOT NULL DEFAULT '50000.00',
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_controls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`sender` enum('user','agent') NOT NULL,
	`text` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`username` varchar(64) NOT NULL,
	`player_name` varchar(128),
	`concern` text,
	`agent_name` varchar(128),
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('deposit','withdraw','bet','win','adjust','jackpot') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`balance_after` decimal(14,2) NOT NULL,
	`game` varchar(64),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`public_user_id` varchar(64) NOT NULL,
	`email` varchar(255),
	`username` varchar(64) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`balance` decimal(14,2) NOT NULL DEFAULT '0.00',
	`role` enum('player','admin','agent','master_agent','superadmin') NOT NULL DEFAULT 'player',
	`is_locked` enum('yes','no') NOT NULL DEFAULT 'no',
	`failed_attempts` bigint NOT NULL DEFAULT 0,
	`locked_until` timestamp,
	`locked_at` timestamp,
	`locked_by` varchar(36),
	`lock_reason` text,
	`unlocked_at` timestamp,
	`unlocked_by` varchar(36),
	`display_name` varchar(128),
	`avatar_url` varchar(512),
	`upline_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_public_user_id_unique` UNIQUE(`public_user_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `wallet_requests` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('deposit','withdraw') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`player_note` text,
	`staff_note` text,
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_settings_logs` ADD CONSTRAINT `game_settings_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_wins` ADD CONSTRAINT `live_wins_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `play_sessions` ADD CONSTRAINT `play_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provably_fair_seeds` ADD CONSTRAINT `provably_fair_seeds_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_requests` ADD CONSTRAINT `wallet_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_requests` ADD CONSTRAINT `wallet_requests_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `game_controls_enabled_idx` ON `game_controls` (`enabled`);--> statement-breakpoint
CREATE INDEX `gsl_created_idx` ON `game_settings_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `gsl_actor_idx` ON `game_settings_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `live_wins_created_idx` ON `live_wins` (`created_at`);--> statement-breakpoint
CREATE INDEX `play_sessions_user_idx` ON `play_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `play_sessions_status_idx` ON `play_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `play_sessions_user_game_status_idx` ON `play_sessions` (`user_id`,`game_id`,`status`);--> statement-breakpoint
CREATE INDEX `play_sessions_status_updated_idx` ON `play_sessions` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `pfs_user_idx` ON `provably_fair_seeds` (`user_id`);--> statement-breakpoint
CREATE INDEX `pfs_status_idx` ON `provably_fair_seeds` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_last_seen_idx` ON `sessions` (`last_seen_at`);--> statement-breakpoint
CREATE INDEX `sm_ticket_idx` ON `support_messages` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `sm_created_idx` ON `support_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `st_user_idx` ON `support_tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `st_status_idx` ON `support_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tx_user_idx` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `tx_created_idx` ON `transactions` (`created_at`);--> statement-breakpoint
CREATE INDEX `tx_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `tx_game_idx` ON `transactions` (`game`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_public_user_id_idx` ON `users` (`public_user_id`);--> statement-breakpoint
CREATE INDEX `users_upline_idx` ON `users` (`upline_id`);--> statement-breakpoint
CREATE INDEX `wr_status_idx` ON `wallet_requests` (`status`);--> statement-breakpoint
CREATE INDEX `wr_user_idx` ON `wallet_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `wr_created_idx` ON `wallet_requests` (`created_at`);