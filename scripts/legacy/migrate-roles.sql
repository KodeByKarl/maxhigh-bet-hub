-- Add superadmin to users.role (Domain 2/3 roles)
USE maxhigh;

ALTER TABLE users
  MODIFY COLUMN role ENUM('player','admin','superadmin') NOT NULL DEFAULT 'player';
