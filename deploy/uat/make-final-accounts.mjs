// Run LOCALLY. Usage: node deploy/uat/make-final-accounts.mjs <secretsDir-outside-repo>
// Writes <dir>/uat-final-credentials.txt (private) and <dir>/uat-final-accounts.sql (hashes only).
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out || path.resolve(out).startsWith(path.resolve('.'))) throw Error('Secrets directory must be outside the repository');
const pw = () => randomBytes(14).toString('base64url');
const owner = pw();
const player = pw();
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `-- UAT reduction to two synthetic accounts. Hashes only.
START TRANSACTION;
UPDATE users SET upline_id = NULL;
DELETE FROM users WHERE username IN ('uat_admin','uat_master','uat_agent','uat_player2','uat_player3','uat_player4','uat_player5');
UPDATE users SET username='uat_owner', public_user_id='uat_owner', display_name='UAT Owner', role='superadmin',
  password_hash=${q(await hash(owner, 10))}, balance=0.00, failed_attempts=0, locked_until=NULL, is_locked='no'
  WHERE username='uat_superadmin';
UPDATE users SET username='uat_player', public_user_id='uat_player', display_name='UAT Player', role='player',
  password_hash=${q(await hash(player, 10))}, balance=1000.00, failed_attempts=0, locked_until=NULL, is_locked='no'
  WHERE username='uat_player1';
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users);
COMMIT;
SELECT username, role, balance FROM users ORDER BY username;
`;
fs.writeFileSync(path.join(out, 'uat-final-accounts.sql'), sql, { mode: 0o600 });
fs.writeFileSync(path.join(out, 'uat-final-credentials.txt'),
  `MaxHigh UAT final accounts (synthetic test credits only)\nuat_owner\tsuperadmin\t${owner}\nuat_player\tplayer\t${player}\n`, { mode: 0o600 });
console.log('Wrote uat-final-accounts.sql and uat-final-credentials.txt');
