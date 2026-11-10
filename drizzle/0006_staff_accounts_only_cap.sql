-- The client-account cap counts STAFF accounts only (role other than 'player'). Ordinary player accounts never count.
-- "Counted" = account_class 'client' AND role <> 'player' AND not admin-disabled. Re-runnable (CREATE OR REPLACE, idempotent recount).
-- Still shipped inactive: account_limits.enforced stays 'no' until the developer activation step. No account or balance is altered.
-- Role changes are covered: promoting a player to a staff role while the cap is full is refused (CLIENT_ACCOUNT_LIMIT).
CREATE OR REPLACE TRIGGER `users_client_cap_bi` BEFORE INSERT ON `users` FOR EACH ROW
BEGIN
  DECLARE v_max INT;
  DECLARE v_enf VARCHAR(3);
  DECLARE v_act INT;
  IF NEW.account_class = 'client' AND NEW.role <> 'player' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL) THEN
    SELECT `max_client_accounts`, `enforced`, `active_clients` INTO v_max, v_enf, v_act FROM `account_limits` WHERE `id` = 'default' FOR UPDATE;
    IF v_enf = 'yes' AND v_act >= v_max THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLIENT_ACCOUNT_LIMIT';
    END IF;
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_ai` AFTER INSERT ON `users` FOR EACH ROW
BEGIN
  IF NEW.account_class = 'client' AND NEW.role <> 'player' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL) THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` + 1 WHERE `id` = 'default';
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_class_guard_bu` BEFORE UPDATE ON `users` FOR EACH ROW
BEGIN
  DECLARE v_max INT;
  DECLARE v_enf VARCHAR(3);
  DECLARE v_act INT;
  DECLARE v_old INT;
  DECLARE v_new INT;
  IF NEW.account_class <> OLD.account_class AND IFNULL(@maxhigh_class_admin, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ACCOUNT_CLASS_IMMUTABLE';
  END IF;
  SET v_old = IF(OLD.account_class = 'client' AND OLD.role <> 'player' AND NOT (OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL), 1, 0);
  SET v_new = IF(NEW.account_class = 'client' AND NEW.role <> 'player' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL), 1, 0);
  IF v_new = 1 AND v_old = 0 THEN
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
  SET v_old = IF(OLD.account_class = 'client' AND OLD.role <> 'player' AND NOT (OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL), 1, 0);
  SET v_new = IF(NEW.account_class = 'client' AND NEW.role <> 'player' AND NOT (NEW.is_locked = 'yes' AND NEW.locked_by IS NOT NULL), 1, 0);
  IF v_new <> v_old THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` + (v_new - v_old) WHERE `id` = 'default';
  END IF;
END;--> statement-breakpoint
CREATE OR REPLACE TRIGGER `users_client_cap_ad` AFTER DELETE ON `users` FOR EACH ROW
BEGIN
  IF OLD.account_class = 'client' AND OLD.role <> 'player' AND NOT (OLD.is_locked = 'yes' AND OLD.locked_by IS NOT NULL) THEN
    UPDATE `account_limits` SET `active_clients` = `active_clients` - 1 WHERE `id` = 'default';
  END IF;
END;--> statement-breakpoint
UPDATE `account_limits` SET `active_clients` = (SELECT COUNT(*) FROM `users` WHERE `account_class` = 'client' AND `role` <> 'player' AND NOT (`is_locked` = 'yes' AND `locked_by` IS NOT NULL)) WHERE `id` = 'default';
