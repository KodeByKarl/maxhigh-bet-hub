// Sets the disposable clone's test player balance (LOOPBACK qa_clone database only) so high-priced Buy Bonus purchases can be tested.
//   DB_URL=... node scripts/qa/clone-topup.mjs [amount]
import { createRequire } from "node:module";
const url = process.env.DB_URL ?? "";
if (!/@127\.0\.0\.1:\d+\/qa_clone$/.test(url)) throw new Error("refusing: DB_URL is not the disposable loopback qa_clone database");
const mysql = createRequire(new URL("../../package.json", import.meta.url))("mysql2/promise");
const c = await mysql.createConnection(url);
await c.query("UPDATE users SET balance = ? WHERE username = 'uat_player'", [Number(process.argv[2] ?? 100000).toFixed(2)]);
await c.end();
