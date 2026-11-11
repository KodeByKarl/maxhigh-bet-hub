# MaxHigh UAT recovery batches - run sheet

Scope: `maxhigh_staging` (UAT, synthetic data). Nothing here touches production, real money, or services (no restarts).
Each batch is generated from the same reviewed header/footer, runs as root from a root-owned copy whose SHA-256 is checked first,
**stops at the first failure**, writes an evidence log under `/root/maxhigh-evidence/` and leaves a `<batch>.pass` marker only on success.
Later batches refuse to run without the earlier markers. The permanent recovery private key and passphrase exist only on Windows.

Tested locally end-to-end (40 of 40 checks) on MariaDB 10.11.14 with the approved `recovery.py` and real `age`, including refusal cases.

| Order | Batch | What it does | Writes |
|---|---|---|---|
| 1 | `uat-g5.sh` | read-only verification: packet, services, health, resources, tools, admin files, schema, charset, accounts, grants, ledger | evidence files only |
| 2 | `uat-g6g7.sh` | restore-check schema + `maxhigh_stage_restore` (5 privileges) + option file + disposable key in `/dev/shm` | 1 schema, 1 account, 1 file, 1 RAM file |
| 3 | `uat-g8g9.sh` | quiet-window gate, encrypted backup (2 recipients), isolated restore, compare, source-unchanged proof | 1 ciphertext + checksum, restore-check data |
| 4 | `uat-g10a.sh` | removes the RAM key, stages a ciphertext **copy** in `~/maxhigh-retrieval` for the Windows drill | 1 copy |
| 5 | Windows `g10b-drill.ps1` | permanent key opens the real backup; plaintext fingerprint must match | local evidence only |
| 6 | `uat-g11.sh` | risk_controls row (UAT-only values) - needs the drill hash | 1 `risk_controls` row |

## How to run a batch (you type your sudo password)
SSH in: `ssh -i "$env:USERPROFILE\.ssh\maxhigh_vps2" maxhigh-ops@151.242.136.34`, then paste ONE runner line. It prints `RESULT: <batch> PASS` or `FAIL`.
If FAIL: stop, paste the whole output; do not run the next batch.

### 1. G5 - verification
```sh
sudo sh -c 'set -eu; umask 077; d=/root/maxhigh-staging-batches; mkdir -p "$d"; chmod 700 "$d"; install -m 700 -o root -g root /home/maxhigh-ops/maxhigh-batches/uat-g5.sh "$d/uat-g5.sh"; echo "d7b58d54fd0ccade65a86c468f096c1e35ebcd98f1adbef02976a35fc5b0c4e2  $d/uat-g5.sh" | sha256sum --check --strict; exec "$d/uat-g5.sh"'
```
`d7b58d54fd0ccade65a86c468f096c1e35ebcd98f1adbef02976a35fc5b0c4e2`

### 2. G6 + G7 - restore-check schema, account, disposable key
```sh
sudo sh -c 'set -eu; umask 077; d=/root/maxhigh-staging-batches; mkdir -p "$d"; chmod 700 "$d"; install -m 700 -o root -g root /home/maxhigh-ops/maxhigh-batches/uat-g6g7.sh "$d/uat-g6g7.sh"; echo "2c91df57eb5886a5bc95a3b0381512bc0ad1437c174fedd834dce7834bcd487a  $d/uat-g6g7.sh" | sha256sum --check --strict; exec "$d/uat-g6g7.sh"'
```
`2c91df57eb5886a5bc95a3b0381512bc0ad1437c174fedd834dce7834bcd487a`

### 3. G8 + G9 - backup, restore, compare (UAT must be idle for 10 minutes: tell testers to stop)
```sh
sudo sh -c 'set -eu; umask 077; d=/root/maxhigh-staging-batches; mkdir -p "$d"; chmod 700 "$d"; install -m 700 -o root -g root /home/maxhigh-ops/maxhigh-batches/uat-g8g9.sh "$d/uat-g8g9.sh"; echo "38005b571b2ad479e10a3b7b2c57260477bdc46d55e736582ad8a97692359294  $d/uat-g8g9.sh" | sha256sum --check --strict; exec "$d/uat-g8g9.sh"'
```
`38005b571b2ad479e10a3b7b2c57260477bdc46d55e736582ad8a97692359294`
It ends with the three "WINDOWS DRILL INPUTS" values (ciphertext name, ciphertext sha256, plaintext sha256). They are not secret.

### 4. G10a - remove disposable key, stage ciphertext copy
```sh
sudo sh -c 'set -eu; umask 077; d=/root/maxhigh-staging-batches; mkdir -p "$d"; chmod 700 "$d"; install -m 700 -o root -g root /home/maxhigh-ops/maxhigh-batches/uat-g10a.sh "$d/uat-g10a.sh"; echo "096b331787490fd38da8bb293d07dc6aa4eafd57652be4eafa2afe7a43bbd74f  $d/uat-g10a.sh" | sha256sum --check --strict; exec "$d/uat-g10a.sh"'
```
`096b331787490fd38da8bb293d07dc6aa4eafd57652be4eafa2afe7a43bbd74f`

### 5. G10b - Windows drill with the PERMANENT key (interactive passphrase, Windows only)
The assistant downloads the staged ciphertext with plain `scp` (no sudo). Then, in PowerShell:
```powershell
.\g10b-drill.ps1 -Ciphertext "C:\Users\Keydi\maxhigh-retrieval\<ciphertext name>" -ExpectedCiphertextSha256 <ciphertext sha256> -ExpectedPlaintextSha256 <plaintext sha256>
```
It asks for the recovery-key passphrase in that console only. On success it prints `--g10-plaintext-sha256 <hash>`.

### 6. G11 - risk_controls (UAT-only values; refuses unless the drill hash matches)
```sh
sudo sh -c 'set -eu; umask 077; d=/root/maxhigh-staging-batches; mkdir -p "$d"; chmod 700 "$d"; install -m 700 -o root -g root /home/maxhigh-ops/maxhigh-batches/uat-g11.sh "$d/uat-g11.sh"; echo "a6247ad46ff3821f01626084bbd84bd64abee23f24e6ad24ae0104cd2f0dee81  $d/uat-g11.sh" | sha256sum --check --strict; exec "$d/uat-g11.sh" --g10-plaintext-sha256 <HASH FROM THE WINDOWS DRILL>'
```
`a6247ad46ff3821f01626084bbd84bd64abee23f24e6ad24ae0104cd2f0dee81`
Values written (UAT only, never for real money): max_single_bet 100000.00, max_daily_payout 100000000.00, max_weekly_limit 1000000000.00, auto_flag_large_wins yes, large_win_threshold 10000.00.

## Abort and rollback
- G5: read-only. Nothing to roll back.
- G6/G7: if it fails after creating objects, do NOT re-run (pre-checks will refuse). Report the output. The objects touch only `maxhigh_staging_restorecheck` and the account `maxhigh_stage_restore`; they cannot affect `maxhigh_staging`.
- G8/G9: only reads `maxhigh_staging`. A failed or interrupted attempt leaves a ciphertext and possibly a non-empty restore-check schema; a retry needs a fresh restore-check schema, which is a root-level drop that needs your explicit decision.
- G10a: removes only the RAM key. The ciphertext in `/var/backups/maxhigh-staging` is never deleted.
- G11: inserts one row. Its value can be corrected with a single-row `UPDATE` through the reviewed path; the row is never deleted. The batch refuses to run if a row already exists.
- At any time: `sudo rm -f /dev/shm/maxhigh-verify.key` removes the disposable key.

## Evidence (all root-only, hashed)
`/root/maxhigh-evidence/<batch>-<UTC>.log` (full transcript, hash printed at the end), `<batch>.pass` (markers), `G11-dryrun-*.out`, `G11-commit-*.out`, `G11-evidence-*.txt`,
and a syslog line tagged `maxhigh-uat-change` for the risk_controls write.
