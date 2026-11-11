// Run LOCALLY (needs bcryptjs from node_modules). Generates synthetic UAT accounts.
// Usage: node deploy/uat/make-seed.mjs <outDir-outside-repo>
// Writes <outDir>/uat-credentials.txt (KEEP PRIVATE; share with testers yourself)
//    and <outDir>/uat-seed.sql (bcrypt hashes only; safe to upload).
import { hash } from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out || path.resolve(out).startsWith(path.resolve('.'))) throw Error('Give an output directory OUTSIDE the repository');
fs.mkdirSync(out, { recursive: true });
const pw = () => randomBytes(12).toString('base64url');
const accounts = [
  ['uat_superadmin', 'superadmin', '0.00'], ['uat_admin', 'admin', '0.00'],
  ['uat_master', 'master_agent', '0.00'], ['uat_agent', 'agent', '0.00'],
  ...Array.from({ length: 5 }, (_, i) => [`uat_player${i + 1}`, 'player', '1000.00']),
];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = '-- Synthetic UAT accounts. Balances are test credits only.\nSTART TRANSACTION;\n';
let creds = 'MaxHigh UAT synthetic accounts (test credits only, no real money)\n';
const ids = {};
for (const [u, role, bal] of accounts) {
  const p = pw();
  ids[u] = randomUUID();
  const upline = u === 'uat_agent' ? ids.uat_master : u.startsWith('uat_player') ? ids.uat_agent : null;
  sql += `INSERT INTO users (id,public_user_id,email,username,password_hash,balance,role,display_name,upline_id) VALUES (${q(ids[u])},${q(u)},NULL,${q(u)},${q(await hash(p, 10))},${bal},${q(role)},${q('UAT ' + u)},${upline ? q(upline) : 'NULL'});\n`;
  creds += `${u}\t${role}\t${p}\n`;
}
sql += 'COMMIT;\n';
fs.writeFileSync(path.join(out, 'uat-seed.sql'), sql, { mode: 0o600 });
fs.writeFileSync(path.join(out, 'uat-credentials.txt'), creds, { mode: 0o600 });
console.log('Wrote uat-seed.sql and uat-credentials.txt to', out);
