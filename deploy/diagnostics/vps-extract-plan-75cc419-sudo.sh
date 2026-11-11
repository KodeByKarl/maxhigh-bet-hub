#!/bin/sh
# Run as root. Installs the reviewed control kit, extracts the PINNED release (no start, no SQL), then prints the READ-ONLY migration plan.
set -eu
umask 077
[ "$(id -u)" = 0 ]
SHA=75cc41980c70a2d188a9a8263ed56d4eb580d7a1
K=/root/maxhigh-vps-controls
IN=/home/maxhigh-ops/maxhigh-release-75cc419
rm -rf "$K.new"; mkdir -p "$K.new"
cp -a /home/maxhigh-ops/maxhigh-kit-75cc419/vps-setup/. "$K.new/"
mkdir -p "$K.new/uat"; cp -a /home/maxhigh-ops/maxhigh-kit-75cc419/uat/. "$K.new/uat/"
chown -R root:root "$K.new"; chmod -R go-rwx "$K.new"
( cd "$K.new" && sha256sum --check --strict CONTROL_SHA256SUMS | grep -v ': OK$' || true )
( cd "$K.new" && sha256sum --check --strict --quiet CONTROL_SHA256SUMS ) && echo "control kit verified"
rm -rf "$K"; mv "$K.new" "$K"
echo "== extract"
cd "$K" && python3 -B stage.py extract --approve EXTRACT --inbox "$IN"
ls -ld /var/www/maxhigh/staging/releases/*
echo "== migration plan (read-only)"
sh "$K/uat/migrate-uat-root.sh" "$SHA" plan
