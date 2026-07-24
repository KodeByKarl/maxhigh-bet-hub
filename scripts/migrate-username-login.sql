-- Allow username-based auth: email is optional contact, not required for login.
-- Run once on existing MaxHigh databases:
--   mysql -u root -p maxhigh < scripts/migrate-username-login.sql

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(255) NULL;
