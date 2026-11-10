import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import fs from "node:fs";
import { migrate, preflight } from "./migrate.mjs";
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
        // A pristine database has every migration pending: build the immutable baseline + sentinel rows first.
        const total = fs.readdirSync("drizzle").filter((x) => x.endsWith(".sql")).length;
        if (pending.length === total) {
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
      const [[risk]] = await db.query("SELECT COUNT(*) AS n FROM risk_controls WHERE id='default'");
      assert.equal(Number(risk.n), 1, "default risk_controls row must exist after migration");
      // Migration 0005 (access restrictions) must land INACTIVE: enforcement off, no grants, five backstop triggers.
      const [[lim]] = await db.query("SELECT enforced, max_client_accounts AS m FROM account_limits WHERE id='default'");
      assert.deepEqual([lim.enforced, Number(lim.m)], ["no", 2], "restrictions must ship inactive");
      const [[grants]] = await db.query("SELECT COUNT(*) AS n FROM entitlement_grants");
      assert.equal(Number(grants.n), 0);
      const [trg] = await db.query("SHOW TRIGGERS");
      assert.equal(trg.filter((t) => /^users_(client_cap|class_guard)/.test(t.Trigger)).length, 5);
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
  // Preflight: dirty legacy data must block the upgrade before any DDL, and change nothing.
  // Risk preservation: a customized risk_controls row must survive 0004 untouched.
  for (const [name, dirty] of [
    ["audit_remediation_preflight_dirty", true],
    ["audit_remediation_risk_preserved", false],
  ]) {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);
    const c = await mysql.createConnection({ ...options, database: name });
    try {
      const directory = `audit/remediation/runtime/${name}-baseline`;
      fs.mkdirSync(directory, { recursive: true });
      fs.copyFileSync("drizzle/0000_init-from-schema.sql", directory + "/0000_init-from-schema.sql");
      await migrate(c, { apply: true, directory });
      await c.query(
        "INSERT IGNORE INTO users(id,public_user_id,username,password_hash,balance,role) VALUES ('pf-user','pf_user','pf_user','fixture',50.00,'player')",
      );
      await c.query(
        "INSERT IGNORE INTO transactions(id,user_id,type,amount,balance_after) VALUES ('pf-ledger','pf-user','deposit',50.00,50.00)",
      );
      if (dirty) {
        await c.query("SET FOREIGN_KEY_CHECKS=0");
        await c.query(
          "INSERT IGNORE INTO transactions(id,user_id,type,amount,balance_after) VALUES ('pf-orphan','missing-user','deposit',1.00,1.00)",
        );
        await c.query("SET FOREIGN_KEY_CHECKS=1");
        for (const id of ["pf-open-1", "pf-open-2"])
          await c.query(
            "INSERT IGNORE INTO play_sessions(id,user_id,game_id,status,bet) VALUES (?,'pf-user','golden-panther','open',5)",
            [id],
          );
        for (const id of ["pf-seed-1", "pf-seed-2"])
          await c.query(
            "INSERT IGNORE INTO provably_fair_seeds(id,user_id,server_seed,server_seed_hash,client_seed,status) VALUES (?,'pf-user','s','h','c','active')",
            [id],
          );
        const issues = await preflight(c, (await migrate(c, { apply: false })));
        assert.equal(issues.length, 3, JSON.stringify(issues));
        await assert.rejects(migrate(c, { apply: true }), /Migration preflight failed/);
        const [[ledger]] = await c.query("SELECT COUNT(*) AS n FROM _maxhigh_migrations");
        assert.equal(Number(ledger.n), 1, "no migration recorded after blocked upgrade");
        const [cols] = await c.query(
          "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='transactions' AND COLUMN_NAME='seq'",
          [name],
        );
        assert.equal(cols.length, 0, "no DDL applied after blocked upgrade");
        const [[tx]] = await c.query("SELECT COUNT(*) AS n FROM transactions");
        assert.equal(Number(tx.n), 2, "ledger rows untouched");
        const [[bal]] = await c.query("SELECT balance FROM users WHERE id='pf-user'");
        assert.equal(bal.balance, "50.00");
        results.push({ database: name, mode: "dirty data blocked by preflight", passed: true });
      } else {
        await c.query(
          "INSERT INTO risk_controls(id,max_single_bet,max_daily_payout,max_weekly_limit,auto_flag_large_wins,large_win_threshold) VALUES ('default',777,888888,99999,'no',12345) ON DUPLICATE KEY UPDATE max_single_bet=777,max_daily_payout=888888,max_weekly_limit=99999,auto_flag_large_wins='no',large_win_threshold=12345",
        );
        await migrate(c, { apply: true });
        const [[risk]] = await c.query("SELECT * FROM risk_controls WHERE id='default'");
        assert.equal(risk.max_single_bet, "777.00");
        assert.equal(risk.max_daily_payout, "888888.00");
        assert.equal(risk.max_weekly_limit, "99999.00");
        assert.equal(risk.auto_flag_large_wins, "no");
        assert.equal(risk.large_win_threshold, "12345.00");
        const [[rows]] = await c.query("SELECT COUNT(*) AS n FROM risk_controls");
        assert.equal(Number(rows.n), 1);
        const [[tx]] = await c.query("SELECT balance_after FROM transactions WHERE id='pf-ledger'");
        assert.equal(tx.balance_after, "50.00");
        results.push({ database: name, mode: "configured risk row preserved", passed: true });
      }
    } finally {
      await c.end();
    }
  }
} finally {
  await admin.end();
}
const outputDirectory = process.env.MIGRATION_OUTPUT ?? "audit/remediation/evidence";
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  outputDirectory + "/migrations.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
