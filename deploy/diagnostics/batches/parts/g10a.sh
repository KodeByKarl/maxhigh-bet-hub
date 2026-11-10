
# -------------------------------------------------------------------------------------------------------- G10a body
# After a PASSING backup/restore/compare: remove the disposable RAM key and stage a COPY of the ciphertext (plus its checksum)
# in the maxhigh-ops home so it can be fetched with plain scp and decrypted on Windows with the PERMANENT key (G10b).
# Nothing is deleted except the disposable verification key in RAM. The original ciphertext and restore-check schema stay.

RETR=/home/maxhigh-ops/maxhigh-retrieval

main() {
  set -Eeuo pipefail
  step "Gate: earlier evidence"
  need_marker G5; need_marker G6G7; need_marker G8G9
  [ "$(marker_val G8G9 compare)" = PASS ] && ok "G8G9.pass records compare = PASS" || die "G8G9 did not record a passing compare"
  CT=$(marker_val G8G9 ciphertext); CT_SHA=$(marker_val G8G9 ciphertext_sha256); PT_SHA=$(marker_val G8G9 plaintext_sha256)
  [ -f "$BACKUPS/$CT" ] && [ "$(sha_of "$BACKUPS/$CT")" = "$CT_SHA" ] && ok "original ciphertext still present and unchanged" || die "original ciphertext missing or changed"

  step "G10a. Remove the disposable verification key (RAM only)"
  if [ -e "$SHM_KEY" ]; then rm -f "$SHM_KEY"; fi
  [ ! -e "$SHM_KEY" ] && ok "$SHM_KEY no longer exists" || bad "verification key still present"
  [ -z "$(find /dev/shm -maxdepth 1 -name 'maxhigh-verify*' 2> /dev/null)" ] && ok "no verification key leftovers in /dev/shm" || bad "leftover files in /dev/shm"

  step "G10a. Stage a copy of the ciphertext for off-host retrieval (permanent-key drill on Windows)"
  install -d -m 700 -o maxhigh-ops -g maxhigh-ops "$RETR"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$BACKUPS/$CT" "$RETR/$CT"
  install -m 600 -o maxhigh-ops -g maxhigh-ops "$BACKUPS/$CT.sha256" "$RETR/$CT.sha256"
  [ "$(sha_of "$RETR/$CT")" = "$CT_SHA" ] && ok "staged copy matches the ciphertext checksum" || bad "staged copy checksum differs"
  [ "$(stat -c '%U:%G %a' "$RETR/$CT")" = "maxhigh-ops:maxhigh-ops 600" ] && ok "staged copy is owned by maxhigh-ops, mode 600 (ciphertext only)" || bad "staged copy owner/mode"
  [ "$FAILS" -eq 0 ] || exit 1

  mark ciphertext "$CT"
  mark ciphertext_sha256 "$CT_SHA"
  mark plaintext_sha256 "$PT_SHA"
  mark retrieval_path "$RETR/$CT"
  step "G10a summary"
  echo "Verification key removed. Fetch with plain scp (no sudo): $RETR/$CT"
  echo "Windows drill must reproduce plaintext sha256: $PT_SHA"
}
