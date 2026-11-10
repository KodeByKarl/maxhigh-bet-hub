import assert from "node:assert/strict";
import { destructiveGuardViolations } from "./lib/destructive-guard";

const ok = {
  MYSQL_HOST: "127.0.0.1",
  MYSQL_DATABASE: "maxhigh_dev",
  ALLOW_DESTRUCTIVE_SCRIPTS: "disposable-test-only",
  CONFIRM_DESTRUCTIVE_DB: "maxhigh_dev",
} as NodeJS.ProcessEnv;
assert.deepEqual(destructiveGuardViolations(ok), []);
const blocked = (env: Record<string, string>) =>
  assert.ok(destructiveGuardViolations({ ...ok, ...env } as NodeJS.ProcessEnv).length > 0, JSON.stringify(env));
blocked({ NODE_ENV: "production" });
blocked({ APP_ENV: "Production" });
blocked({ ALLOW_DESTRUCTIVE_SCRIPTS: "yes" });
blocked({ CONFIRM_DESTRUCTIVE_DB: "other" });
blocked({ MYSQL_HOST: "10.1.2.3" });
blocked({ MYSQL_DATABASE: "maxhigh", CONFIRM_DESTRUCTIVE_DB: "maxhigh" });
blocked({ DATABASE_URL: "mysql://u:p@db.example.com:3306/maxhigh_dev" });
// production-named database is refused even when everything else is set
assert.ok(
  destructiveGuardViolations({ ...ok, MYSQL_DATABASE: "maxhigh_prod", CONFIRM_DESTRUCTIVE_DB: "maxhigh_prod" } as NodeJS.ProcessEnv).length > 0,
);
console.log("destructive guard ok");
