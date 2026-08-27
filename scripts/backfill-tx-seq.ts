/**
 * One-time / repair: re-number transactions.seq in chronological order.
 * Run: npx tsx --env-file=.env scripts/backfill-tx-seq.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const user = process.env.MYSQL_USER ?? "root";
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE ?? "maxhigh";

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log("Backfilling transactions.seq...");
  await conn.query(`ALTER TABLE transactions MODIFY seq BIGINT UNSIGNED NOT NULL`);
  await conn.query(`UPDATE transactions SET seq = seq + 10000000`);
  await conn.query(`
    UPDATE transactions t
    JOIN (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY created_at ASC,
            (balance_after - amount) ASC,
            CASE type WHEN 'bet' THEN 0 WHEN 'win' THEN 1 WHEN 'jackpot' THEN 2 ELSE 3 END,
            id ASC
        ) AS new_seq
      FROM transactions
    ) x ON t.id = x.id
    SET t.seq = x.new_seq
  `);
  const [maxRow] = await conn.query<any[]>(`SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM transactions`);
  const nextSeq = Number(maxRow?.[0]?.next_seq ?? 1);
  await conn.query(
    `ALTER TABLE transactions MODIFY seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE, AUTO_INCREMENT = ${nextSeq}`,
  );
  console.log(`Done — next AUTO_INCREMENT = ${nextSeq}`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
