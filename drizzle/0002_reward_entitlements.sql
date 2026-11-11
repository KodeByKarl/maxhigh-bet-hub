CREATE TABLE `reward_entitlements` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(128) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`claimed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reward_entitlements` ADD CONSTRAINT `reward_entitlements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;