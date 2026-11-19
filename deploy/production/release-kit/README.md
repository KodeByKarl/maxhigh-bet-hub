# MaxHigh release kit (upgrade of a running production root)

Replaces the one-time `maxhigh-production-29656ce` kit, which could only move production from `8066092` to `29656ce`
(its `plan` requires port 18080 to report `8066092`, and `stage` refuses when `/var/www/maxhigh/production` exists).

| File | Role |
|---|---|
| `inspect-readonly.py` | READ-ONLY discovery: what production really serves, service/process/Caddy state, history, DB sharing, game-access SQL |
| `game-access-readonly-check.sql` | Read-only DB audit (copy from `deploy/production/`) |
| `operate.py` | `plan` → `backup` → `stage` → `activate` (auto-rollback) → `verify`; `rollback` |
| `candidate.json` | The ONLY place the candidate is named: commit SHA + archive/manifest SHA-256 from the Linux builder |
| `run.mjs`, `pm2.config.cjs` | Runtime launcher; `run.mjs` adds a probe-only `PRODUCTION_PROBE_SHA` override for staging the candidate |
| `isolated-acceptance.mjs` | 100-game acceptance against a loopback, disposable-database instance of the artifact |
| `test_operate.py` | Local safety tests (`python3 -I test_operate.py`) |

## Safety properties

- The previous release is **proven**, not assumed: `target.json`, backend health, release manifest, the service's process
  working directory and the SHA-256 of **every** public entry asset must all name the same release, or nothing proceeds.
- That proven release, the UAT release and exact copies of `target.json`, `run.mjs`, `pm2.config.cjs` are recorded in the
  verified backup; `rollback` restores exactly those and waits for health to report the recorded release.
- Verified backup = full `mariadb-dump`, restore into an isolated scratch database, and a byte-level checksum of all
  re-exported rows. No migrations are applied (`stage` stops if the migration journal differs). UAT is never restarted.
- Activation is an atomic `target.json` switch + one service restart; a failed `verify` triggers automatic rollback.

## Commands (administrator's authenticated terminal on the VPS)

Upload `release.tgz` (from the Linux builder) and this directory to `/home/maxhigh-ops/maxhigh-production-release/`.

```bash
cd /home/maxhigh-ops/maxhigh-production-release
sha256sum -c SHA256SUMS                         # release.tgz and every kit file

# 0. Read-only evidence first (send the JSON back for review; it contains no secrets)
sudo /usr/bin/python3 -I inspect-readonly.py > inspect-$(date +%Y%m%d-%H%M).json

# 1. Install the reviewed kit root-owned, bound to the candidate SHA
K=/usr/local/libexec/maxhigh-release-d22dfd9
sudo /usr/bin/install -d -o root -g root -m 0755 "$K"
sudo /usr/bin/install -o root -g root -m 0700 operate.py "$K/operate.py"
sudo /usr/bin/install -o root -g root -m 0644 run.mjs pm2.config.cjs candidate.json "$K/"

# 2. Dry run: proves the live release and prints the plan; changes nothing
sudo /usr/bin/python3 -I "$K/operate.py" plan

# --- STOP: production activation requires the project owner's explicit go-ahead ---
sudo /usr/bin/python3 -I "$K/operate.py" backup     # verified backup + isolated restore
sudo /usr/bin/python3 -I "$K/operate.py" stage      # extract, checksum, migration-journal check, read-only probe
sudo /usr/bin/python3 -I "$K/operate.py" activate   # switch; automatic rollback if verify fails
sudo /usr/bin/python3 -I "$K/operate.py" verify     # repeatable
sudo /usr/bin/python3 -I "$K/operate.py" rollback   # manual return to the recorded previous release
```

Live acceptance after activation (from the developer workstation, non-developer QA player only, bounded ₱80 stake):

```bash
PRODUCTION_RELEASE_SHA=d22dfd99ef47afdf26d60eaf69ab1244adab910f \
PRODUCTION_RELEASE_DIR=output/linux-build-d22dfd9/release \
node deploy/production/verify-games.mjs --run
```
