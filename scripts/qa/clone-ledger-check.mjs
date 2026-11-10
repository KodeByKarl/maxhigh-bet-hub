// Wallet/ledger integrity checks on the DISPOSABLE loopback clone (DB_URL must be qa_clone on 127.0.0.1). Read-only.
//   DB_URL=... node scripts/qa/clone-ledger-check.mjs
import { createRequire } from "node:module";
const url = process.env.DB_URL ?? "";
if (!/@127\.0\.0\.1:\d+\/qa_clone$/.test(url)) throw new Error("refusing: DB_URL is not the disposable loopback qa_clone database");
const mysql = createRequire(new URL("../../package.json", import.meta.url))("mysql2/promise");
const c = await mysql.createConnection(url);
const one = async (sql) => Object.values((await c.query(sql))[0][0])[0];
const checks = {
  negativeBalances: await one("SELECT COUNT(*) FROM users WHERE balance < 0"),
  duplicateLedgerSeq: await one("SELECT COUNT(*) FROM (SELECT seq FROM transactions GROUP BY seq HAVING COUNT(*) > 1) d"),
  openBonusSessionsLeft: await one("SELECT COUNT(*) FROM play_sessions WHERE status='open'"),
  transactionsWithoutUser: await one("SELECT COUNT(*) FROM transactions t LEFT JOIN users u ON u.id=t.user_id WHERE u.id IS NULL"),
  ledgerRows: await one("SELECT COUNT(*) FROM transactions"),
};
await c.end();
const ok = checks.negativeBalances === 0 && checks.duplicateLedgerSeq === 0 && checks.openBonusSessionsLeft === 0 && checks.transactionsWithoutUser === 0;
console.log(JSON.stringify(checks));
process.exit(ok ? 0 : 1);
