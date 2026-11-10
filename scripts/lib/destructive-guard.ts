import "dotenv/config";

/**
 * Refuses to let destructive maintenance scripts (drop/truncate/delete) run against anything
 * that is not an explicitly opted-in, disposable, loopback database. Runs before any connection.
 *
 * Every condition must hold:
 *  - NODE_ENV / APP_ENV / MAXHIGH_ENV is not "production"
 *  - ALLOW_DESTRUCTIVE_SCRIPTS === "disposable-test-only"
 *  - CONFIRM_DESTRUCTIVE_DB equals the target database name
 *  - the host is loopback
 *  - the database name looks disposable (test, demo, dev, audit, scratch, disposable, local)
 */
export function resolveTarget(env: NodeJS.ProcessEnv = process.env) {
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    return { host: url.hostname, database: decodeURIComponent(url.pathname.slice(1)) };
  }
  return { host: env.MYSQL_HOST ?? "127.0.0.1", database: env.MYSQL_DATABASE ?? "" };
}

export function destructiveGuardViolations(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const problems: string[] = [];
  const target = resolveTarget(env);
  for (const name of ["NODE_ENV", "APP_ENV", "MAXHIGH_ENV"])
    if (String(env[name] ?? "").toLowerCase() === "production")
      problems.push(`${name} is production`);
  if (env.ALLOW_DESTRUCTIVE_SCRIPTS !== "disposable-test-only")
    problems.push("ALLOW_DESTRUCTIVE_SCRIPTS=disposable-test-only is required");
  if (!target.database) problems.push("no target database configured");
  else if (env.CONFIRM_DESTRUCTIVE_DB !== target.database)
    problems.push("CONFIRM_DESTRUCTIVE_DB must equal the target database name");
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.host))
    problems.push("target host is not loopback");
  if (target.database && !/(^|[_-])(test|demo|dev|audit|scratch|disposable|local)([_-]|$)/i.test(target.database))
    problems.push("database name does not look disposable (needs test/demo/dev/audit/scratch/disposable/local)");
  return problems;
}

export function assertDisposableTarget(scriptName: string): void {
  const problems = destructiveGuardViolations();
  if (problems.length === 0) return;
  console.error(`[${scriptName}] refused: destructive script blocked.`);
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
