import { createRequire } from "node:module";
const m = createRequire("D:/Porjects/maxhigh-bet-hub-release/package.json")("mysql2/promise");
const c = await m.createConnection("mysql://root:audit-local-only@127.0.0.1:19307/qa_clone");
const [cols] = await c.query("SHOW COLUMNS FROM users");
console.log(cols.map((x) => x.Field).join(","));
