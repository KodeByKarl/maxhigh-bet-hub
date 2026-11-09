// Read-only DB reconciliation against the disposable clone (refuses anything but 127.0.0.1:19307).
import mysql from "mysql2/promise";
const c = await mysql.createConnection({ host: "127.0.0.1", port: 19307, user: "root", password: process.env.CLONE_ROOT_PW, database: "qa_clone" });
const q = async (sql) => (await c.query(sql))[0];
console.log("tables:", (await q("SHOW TABLES")).length);
const tx = (await q("SHOW COLUMNS FROM transactions")).map((r) => r.Field);
console.log("transactions cols:", tx.join(","));
console.log("per-user: balance vs ledger sum (opening = balance - sum)");
console.table(await q("SELECT u.username, u.balance, COALESCE(SUM(t.amount),0) ledger_sum, ROUND(u.balance-COALESCE(SUM(t.amount),0),2) implied_opening, COUNT(t.id) rows_n FROM users u LEFT JOIN transactions t ON t.user_id=u.id GROUP BY u.id ORDER BY u.username"));
if (tx.includes("balance_after")) console.log("rows where balance_after chain breaks:", (await q("SELECT COUNT(*) n FROM (SELECT user_id, balance_after, amount, LAG(balance_after) OVER (PARTITION BY user_id ORDER BY seq) prev FROM transactions) x WHERE prev IS NOT NULL AND ROUND(prev+amount-balance_after,2)<>0"))[0].n);
console.log("negative balances:", (await q("SELECT COUNT(*) n FROM users WHERE balance<0"))[0].n);
console.log("open play sessions:", JSON.stringify(await q("SELECT game_id, COUNT(*) n, SUM(free_spins_left) fs FROM play_sessions WHERE status='open' GROUP BY game_id")));
await c.end();
