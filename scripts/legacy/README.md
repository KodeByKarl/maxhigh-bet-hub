# Legacy one-off migrators (retired)

These SQL/JS helpers predate the current Drizzle schema and often lag `src/server/db/schema.ts`
(e.g. 3-role enums, missing `feature_state` / agent columns).

**Do not run for new installs.** Use instead:

1. `scripts/schema.sql` — full bootstrap aligned with Drizzle
2. `npm run db:push` — apply `src/server/db/schema.ts` to an existing DB
3. `npm run db:sync` — additive column/table ensures for older DBs
4. `drizzle/` — versioned SQL from `npm run db:generate`

Kept only for historical reference / forensics.
