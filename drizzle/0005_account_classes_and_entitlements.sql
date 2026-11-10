-- Phase 2 access restrictions (additive, reversible, NOT activated by this migration).
-- * users.account_class distinguishes client accounts (count toward the cap) from admin (maintenance/recovery) and qa (synthetic test) accounts.
-- * account_limits is the DB-layer backstop for the client cap. It ships with enforced='no': nothing changes until activation.
--   active_clients is a trigger-maintained counter of client accounts that are not admin-disabled. The single row lock serialises
--   concurrent account creation, and locking reads always see the latest committed value (no snapshot races).
-- * entitlement_grants is an append-only record of developer-signed grants (unlock games, lift cap, authorize exempt accounts).
-- Fully re-runnable (IF NOT EXISTS / CREATE OR REPLACE): a failure midway (e.g. trigger privilege) is fixed and simply re-run; nothing is left half-applied.
-- Rollback: see deploy/handoff/ACCOUNT_AND_GAME_RESTRICTIONS_SPEC.md (drop triggers, tables, column). No historical data is altered.
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `account_class` enum('client','admin','qa') NOT NULL DEFAULT 'client';--> statement-breakpoint
UPDATE `users` SET `account_class` = 'admin' WHERE `role` = 'superadmin' AND `account_class` = 'client';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account_limits` (
  `id` varchar(16) NOT NULL,
  `max_client_accounts` int NOT NULL DEFAULT 2,
  `enforced` enum('yes','no') NOT NULL DEFAULT 'no',
  `active_clients` int NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `account_limits_id` PRIMARY KEY(`id`),
  CONSTRAINT `account_limits_max_nonneg` CHECK (`max_client_accounts` >= 0),
  CONSTRAINT `account_limits_active_nonneg` CHECK (`active_clients` >= 0)
);--> statement-breakpoint
INSERT INTO `account_limits` (`id`, `max_client_accounts`, `enforced`, `active_clients`)
SELECT 'default', 2, 'no', COUNT(*) FROM `users` WHERE `account_class` = 'client' AND NOT (`is_locked` = 'yes' AND `locked_by` IS NOT NULL)
ON DUPLICATE KEY UPDATE `id` = `id`;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entitlement_grants` (
  `id` varchar(36) NOT NULL,
  `nonce` varchar(64) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `payload` text NOT NULL,
  `signature` varchar(256) NOT NULL,
  `key_id` varchar(64) NOT NULL,
  `applied_by` varchar(36),
  `applied_by_username` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `entitlement_grants_id` PRIMARY KEY(`id`),
  CONSTRAINT `entitlement_grants_nonce_unique` UNIQUE(`nonce`)
);--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_bi` BEFORE INSERT ON `users` FOR EACH ROW
BEGIN
  DECLARE v_max INT;
  DECLARE v_enf VARCHAR(3);
  DECLARE v_act INT;
  IF NEW.account_class = 'client' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL) THEN
    SELECT `max_client_accounts`, `enforced`, `active_clients` INTO v_max, v_enf, v_act FROM `account_limits` WHERE `id` = 'default' FOR UPDATE;
    IF v_enf = 'yes' AND v_act >= v_max THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLIENT_ACCOUNT_LIMIT';
    END IF;
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_ai` AFTER INSERT ON `users` FOR EACH ROW
BEGIN
  IF NEW.account_class = 'client' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL) THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` + 1 WHERE `id` = 'default';
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_class_guard_bu` BEFORE UPDATE ON `users` FOR EACH ROW
BEGIN
  DECLARE v_max INT;
  DECLARE v_enf VARCHAR(3);
  DECLARE v_act INT;
  IF NEW.account_class <> OLD.account_class AND IFNULL(@maxhigh_class_admin, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ACCOUNT_CLASS_IMMUTABLE';
  END IF;
  IF NEW.account_class = 'client' AND OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL) THEN
    SELECT `max_client_accounts`, `enforced`, `active_clients` INTO v_max, v_enf, v_act FROM `account_limits` WHERE `id` = 'default' FOR UPDATE;
    IF v_enf = 'yes' AND v_act >= v_max THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLIENT_ACCOUNT_LIMIT';
    END IF;
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_au` AFTER UPDATE ON `users` FOR EACH ROW
BEGIN
  DECLARE v_old INT;
  DECLARE v_new INT;
  SET v_old = IF(OLD.account_class = 'client' AND NOT (OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL), 1, 0);
  SET v_new = IF(NEW.account_class = 'client' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL), 1, 0);
  IF v_new <> v_old THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` + (v_new - v_old) WHERE `id` = 'default';
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_ad` AFTER DELETE ON `users` FOR EACH ROW
BEGIN
  IF OLD.account_class = 'client' AND NOT (OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL) THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` - 1 WHERE `id` = 'default';
  END IF;
END;
