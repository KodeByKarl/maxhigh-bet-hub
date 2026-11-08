CREATE TABLE `financial_operations` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`action` varchar(128) NOT NULL,
	`input_hash` varchar(64) NOT NULL,
	`result` mediumtext,
	`proof` mediumtext,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_operations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fishing_rooms` (
	`game_id` varchar(64) NOT NULL,
	`state` mediumtext NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fishing_rooms_game_id` PRIMARY KEY(`game_id`)
);
--> statement-breakpoint
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `play_sessions` ADD `base_credited` decimal(14,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `seq` bigint unsigned AUTO_INCREMENT NOT NULL, ADD CONSTRAINT `transactions_seq_unique` UNIQUE (`seq`);--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_seq_unique` UNIQUE(`seq`);--> statement-breakpoint
ALTER TABLE `financial_operations` ADD CONSTRAINT `financial_operations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_balance_nonnegative` CHECK (`users`.`balance` >= 0);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_upline_not_self` CHECK (`users`.`upline_id` IS NULL OR `users`.`upline_id` <> `users`.`id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_upline_id_users_id_fk` FOREIGN KEY (`upline_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tx_user_time_idx` ON `transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `tx_seq_idx` ON `transactions` (`seq`);