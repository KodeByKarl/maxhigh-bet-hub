# UAT integration deploy: game redesign (T1) + Buy Bonus rework (T2)

Branch `uat/integration-redesign-buybonus`. Parents: T2 `d4433f3` (Buy Bonus rework, on top of `5733e59` Wild Panther calibration) and T1 `b0c4f87` (100 game folders, 82 slot skins, 18 table/fishing treatments).
Only conflict: `scripts/run-unit.mjs` job list (kept `buy-bonus-spec` and added `game-folders`).

Verified locally on this branch: typecheck, lint, `npm run test:unit` (27 jobs, 0 failures; includes buy-bonus-spec with Wild Panther locked at 10, buy-bonus-modal, game-folders, realms-family, payline/cluster referees, security-regressions, wild-panther), `npm run build`.
Not verified: live UAT, DB-backed integration tests, real-backend Buy & Play, browser console on the hosted site.
Quantity limits for the 79 non-Wild-Panther Buy Bonus games are provisional (see BUY_BONUS_INTEGRATION_HANDOFF.md).

## Steps (operator; needs the SSH key passphrase and sudo)
1. Unlock the key: `Start-Service ssh-agent; ssh-add C:\Users\Keydi\.ssh\maxhigh_vps2`.
2. Build the Linux artifact via the CI path (`deploy/ci/build-artifact.mjs`, Ubuntu 24.04, pinned Node). A Windows build must not be relabelled. This needs the commit on a `ci/staging-artifact-*` branch (never `main`).
3. Transfer and extract per `deploy/staging/FIRST_TRANSFER_GUIDE.md`, then `node deploy/auto-update.mjs --prepare <FULL_SHA>` and `--activate <FULL_SHA>`. Activation writes `previous.json`, which is the rollback pointer.
4. Before activation, take an encrypted DB backup (`recovery.py backup`, see `deploy/uat/OPERATIONS.md` section 4). No schema change in this merge relative to the T2 branch.
5. Restart only if required: `sudo systemctl restart maxhigh-uat`. Hard-refresh the browser afterwards, since the bundle hashes change.
6. Rollback: re-activate the previous release (`previous.json`); Caddy rollback files are listed in OPERATIONS.md section 1.
