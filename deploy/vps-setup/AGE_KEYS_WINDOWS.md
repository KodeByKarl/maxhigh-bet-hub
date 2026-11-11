# age key procedure for MaxHigh backups (Windows operator machine)

Goal: the **permanent recovery private key never exists on the VPS**, and a plaintext copy of it never exists on disk
anywhere. Only *public* recipients (`age1...`) are ever passed to `recovery.py`. Nothing here is run by Claude, CI or the
server. Never print, paste into chat/issues/CI, email, commit or upload a private key.

## 1. Install age (operator machine only)
```powershell
winget install --id FiloSottile.age -e
age --version; age-keygen --version
```
Use the publisher's release if winget is unavailable and verify it against the signature/checksum the project publishes.
The VPS runs Ubuntu's `age` 1.1.1; multiple `-r` recipients are supported by it.

## 2. A private working folder
```powershell
$keys = "$env:USERPROFILE\maxhigh-keys"
New-Item -ItemType Directory -Path $keys | Out-Null
icacls $keys /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F"      # only you
```

## 3. Permanent recovery key: generated straight into a passphrase-encrypted file
The plaintext private key is piped to `age -p` and never touches disk. `cmd /c` is used so PowerShell 5 does not
re-encode the pipe. You will be prompted for a long passphrase (store it in your password manager).
```powershell
cmd /c "age-keygen 2> ""$keys\recovery.pub.txt"" | age -p -o ""$keys\maxhigh-uat-recovery.key.age"""
Get-Content "$keys\recovery.pub.txt"        # shows: Public key: age1....   <- this PUBLIC line is safe to share
```
Copy the `age1...` value: it is `--recipient` number 1. Keep `maxhigh-uat-recovery.key.age` plus its passphrase in at
least two offline places (e.g. encrypted USB in two locations). If both the file and passphrase are lost, every backup is
permanently unreadable.

## 4. Disposable verification key (for the restore drill only)
This key can decrypt only backups that list it as a recipient, and it is thrown away after the drill.
```powershell
age-keygen -o "$keys\maxhigh-uat-verify.key"          # prints: Public key: age1....  <- --recipient number 2
age-keygen -y "$keys\maxhigh-uat-verify.key"          # re-print the public recipient later
```
Transport to the VPS **by terminal paste into RAM only** (nothing is written to the VPS disk):
```text
ssh maxhigh-ops@<host>
sudo sh -c 'umask 077; cat > /dev/shm/maxhigh-verify.key'     # paste the key, then Ctrl-D
...run recovery.py restore with --identity /dev/shm/maxhigh-verify.key ...
sudo rm -f /dev/shm/maxhigh-verify.key                        # always, even if the drill fails
```
After the drill, delete the local `maxhigh-uat-verify.key` as well; it is no longer needed.

## 5. Prove the keys work before relying on them (local, no server)
```powershell
"drill" | Set-Content "$keys\drill.txt"
age -r <recovery age1...> -r <verify age1...> -o "$keys\drill.age" "$keys\drill.txt"
age -d -i "$keys\maxhigh-uat-verify.key" "$keys\drill.age"                 # prints: drill
# Recovery key drill: decrypt the key file into memory only and use it via stdin (passphrase prompt):
cmd /c "age -d ""$keys\maxhigh-uat-recovery.key.age"" | age -d -i - ""$keys\drill.age"""
Remove-Item "$keys\drill.txt","$keys\drill.age"
```

## 6. Rules
- `recovery.py backup` accepts only X25519 public recipients (`age1` + 58 chars), 1-4 distinct, and refuses anything else
  (including `AGE-SECRET-KEY-...` private keys and plugin recipients).
- The recovery key is used **off the VPS**: retrieve the ciphertext (separate approval), decrypt on your machine, restore
  into a throw-away local MariaDB for a full recovery drill.
- `.gitignore` excludes `maxhigh-keys/`, `maxhigh-uat-*.key` and `*.key.age` as a safety net; never rely on it.
- Rotate by generating a new recovery key, adding its recipient to new backups, and keeping the old key until the old
  backups age out.
