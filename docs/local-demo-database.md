# Local demo database

Created a fresh local MariaDB demo database on 2026-11-02 at the user's request. This is new demo data, not a restore of the previous accounts or balances. The seeded player username is `player1`, not `player11`.

The database runs in Docker Desktop using `compose.demo.yml`, binds to 127.0.0.1:3307, and persists its data in the `maxhigh-demo_database-data` named volume. Port 3307 avoids the other local MySQL service on 3306. Random database credentials are stored only in the ignored `.env`. The previous connection configuration is backed up in the ignored `output/database-demo/.env.previous`.

## Demo sign-in

| Role | Username | Password |
| --- | --- | --- |
| Player | player1 | player123 |
| Superadmin | superadmin | super123 |
| Master agent | masteragent | master123 |
| Agent | agent1 | agent123 |

These are the repository's local seed credentials. The player has demo chips for reviewing the games.

## Starting an existing demo database

Start Docker Desktop, then run:

```powershell
docker compose -f compose.demo.yml up -d --wait
npm run dev
```

`npm run dev` now starts Docker Desktop when needed for this configured demo, waits for the MariaDB container to be healthy, and checks the connection and users table before starting Vite. It does not reseed or reset data. Non-demo database configurations are checked without automatically starting Docker.

Data persists when the app or database container stops. Do not remove the named volume if you want to keep demo data.

## First-time setup only

The following sequence was used to initialize the new database:

```powershell
node scripts/qa/configure-demo-database.mjs
docker compose -f compose.demo.yml up -d --wait
node scripts/qa/bootstrap-demo-schema.mjs
npx tsx scripts/db-sync.ts
npm run db:seed
npm run db:seed-chips
```

The bootstrap is restricted to an empty `maxhigh_demo` database. Use the seed commands only when intentionally creating/resetting demo account data. The normal sync script assumes some existing tables, so a schema snapshot is applied before it on a new database.

## Login fix and verification

The login service now allows only intentional invalid-credential and locked-account messages to reach the client. Database queries, SQL parameters, nested causes, and other unexpected errors become a generic temporary sign-in failure. Server diagnostics log only a safe error code.

- MariaDB health check passed.
- Schema sync and account/chip seeding passed.
- Real browser sign-in with player1 passed; no SQL was exposed.
- Error normalization regression tests, ESLint on changed modules, and TypeScript passed.
- Browser result: `output/database-demo/login-verification.json`.
- Screenshot: `output/database-demo/signed-in.png`.

On the later sign-in outage, Docker Desktop was off while Vite was still serving the website. Restarted Docker and the existing demo container without reseeding. Added database-aware development startup in `scripts/start-dev.mjs` and verified real HTTP login, session-cookie authentication, and logout with a temporary account, which was removed afterward. The test leaves existing player sessions untouched. Results: `output/database-demo/http-login-verification.json`.
