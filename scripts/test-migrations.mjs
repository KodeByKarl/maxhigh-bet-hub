import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import fs from "node:fs";
import { migrate } from "./migrate.mjs";
const options = {
  host: "127.0.0.1",
  port: 19307,
  user: "root",
  password: "audit-local-only",
  multipleStatements: false,
};
// Deliberately fixed loopback audit port. Never consumes the application .env target.
const admin = await mysql.createConnection(options);
const results = [];
try {
  for (const [name, upgrade] of [
    ["audit_remediation_fresh", false],
    ["audit_remediation_upgrade", true],
  ]) {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);
    const db = await mysql.createConnection({ ...options, database: name });
    try {
      if (upgrade) {
        // Apply the original immutable baseline before the additive upgrade.
        const pending = await migrate(db, { apply: false });
        if (pending.length === 4) {
          const temp = "audit/remediation/runtime/baseline-migrations";
          fs.mkdirSync(temp, { recursive: true });
          fs.copyFileSync("drizzle/0000_init-from-schema.sql", temp + "/0000_init-from-schema.sql");
          await migrate(db, { apply: true, directory: temp });
          await db.query(
            "INSERT INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('migration-sentinel','migration_sentinel','migration_sentinel','fixture',123.45,'player')",
          );
          await db.query(
            "INSERT INTO transactions(id,user_id,type,amount,balance_after) VALUES ('migration-ledger','migration-sentinel','deposit',123.45,123.45)",
          );
        }
      }
      const applied = await migrate(db, { apply: true });
      assert.deepEqual(await migrate(db, { apply: false }), []);
      assert.deepEqual(await migrate(db, { apply: true }), []);
      const tampered = "audit/remediation/runtime/checksum-negative";
      fs.mkdirSync(tampered, { recursive: true });
      fs.writeFileSync(
        tampered + "/0000_init-from-schema.sql",
        fs.readFileSync("drizzle/0000_init-from-schema.sql", "utf8") +
          "\n-- deliberate isolated checksum test\n",
      );
      await assert.rejects(
        migrate(db, { apply: false, directory: tampered }),
        /Migration checksum mismatch/,
      );
      const [fks] = await db.query(
        "SELECT TABLE_NAME,DELETE_RULE FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?",
        [name],
      );
      assert.equal(fks.find((x) => x.TABLE_NAME === "transactions").DELETE_RULE, "RESTRICT");
      if (upgrade) {
        const [[sentinel]] = await db.query(
          "SELECT balance FROM users WHERE id='migration-sentinel'",
        );
        assert.equal(sentinel.balance, "123.45");
        await assert.rejects(db.query("DELETE FROM users WHERE id='migration-sentinel'"));
      }
      results.push({
        database: name,
        mode: upgrade ? "upgrade" : "fresh",
        applied,
        foreignKeys: fks.length,
        passed: true,
      });
    } finally {
      await db.end();
    }
  }
  const legacyName = "audit_remediation_legacy_feature";
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${legacyName}\``);
  const legacy = await mysql.createConnection({ ...options, database: legacyName });
  try {
    const directory = "audit/remediation/runtime/legacy-feature-baseline";
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync("drizzle/0000_init-from-schema.sql", directory + "/0000_init-from-schema.sql");
    await migrate(legacy, { apply: true, directory });
    await legacy.query(
      "INSERT IGNORE INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('legacy-feature-owner','legacy-feature-owner','legacy-feature-owner','fixture',123.45,'player')",
    );
    await legacy.query(
      "INSERT IGNORE INTO play_sessions(id,user_id,game_id,status,bet,free_spins_left) VALUES ('legacy-feature','legacy-feature-owner','golden-panther','open',5,10)",
    );
    await assert.rejects(
      migrate(legacy, { apply: true }),
      /Open legacy features require reviewed base-credit reconciliation/,
    );
    const [[feature]] = await legacy.query(
      "SELECT free_spins_left FROM play_sessions WHERE id='legacy-feature'",
    );
    const [[owner]] = await legacy.query(
      "SELECT balance FROM users WHERE id='legacy-feature-owner'",
    );
    assert.equal(Number(feature.free_spins_left), 10);
    assert.equal(owner.balance, "123.45");
    results.push({
      database: legacyName,
      mode: "legacy feature upgrade safely blocked",
      passed: true,
    });
  } finally {
    await legacy.end();
  }
} finally {
  await admin.end();
}
fs.writeFileSync(
  (process.env.MIGRATION_OUTPUT ?? "audit/remediation/evidence") + "/migrations.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
