#!/bin/bash
# =====================================================================================================================
# MaxHigh UAT batch @TAG@ - @TITLE@
# Generated from reviewed parts (header + body + footer). Run ONLY through the runner one-liner, which copies this file
# to a root-owned location and verifies its SHA-256 before executing it. Stops at the first failure.
# Evidence: /root/maxhigh-evidence/@TAG@-<UTC>.log, plus @TAG@.pass (with the log hash) only when every check passed.
# Scope: database maxhigh_staging (UAT, synthetic data) only. The permanent recovery private key and its passphrase
# exist only on the Windows operator machine and are never read, requested or needed here.
# =====================================================================================================================
set -Eeuo pipefail
umask 077
export LC_ALL=C.UTF-8 PATH=/usr/sbin:/usr/bin:/sbin:/bin
[ "$(id -u)" = 0 ] || { echo "STOP  must run as root (via sudo)"; exit 2; }

ARGS=("$@")
EVID=/root/maxhigh-evidence
PKT=/root/maxhigh-staging-385ed041
ADMIN=/root/maxhigh-staging-admin
BACKUPS=/var/backups/maxhigh-staging
SHM_KEY=/dev/shm/maxhigh-verify.key
DB=maxhigh_staging
RESTORE_DB=maxhigh_staging_restorecheck
PACKET_SHA=385ed04116d4f0f43b96b7b27cdd03b681482a05b9dad1ac2d295fbd4d7e40c2
RECOVERY_SHA=b12a38c583bd51ab6c2273905606375f2ca4bde16686777bd023c4d4e8d0365d
RECOVERY_PUB=age1g8y0kk95pvdptc5zzlmadjt0yza4pjuka4xdal9w9ulqxm0se9aqefsjv0
UAT_RELEASE=2294d79afb2b900f13a9cd05c427dc9857b89de1
# Migration ledger as shipped in the approved release (LF-normalised SQL).
LEDGER_EXPECTED='0000_init-from-schema.sql 6378baf80c7281b10db326b75880fa01bc657bb6ee049a94687d87a79671c856;0001_financial_integrity.sql ce92417246b525294cbdf58d99401ef41ccf8242def0b2420c984f761c80956b;0002_reward_entitlements.sql 6acd18c48411a11ec1967d39c33abb62d08743abf7503f6f3149af3776e6d1c6;0003_rapid_quentin_quire.sql 769283b4865423e24c8554406b6642872b27748e93e7eb4b07a2aebce6eb81b2'

install -d -m 700 "$EVID"
TS=$(date -u +%Y%m%dT%H%M%SZ)
LOG="$EVID/@TAG@-$TS.log"
PENDING="$EVID/.@TAG@.pending"
: > "$PENDING"

FAILS=0
ok()   { printf 'PASS  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; FAILS=$((FAILS + 1)); }
info() { printf 'INFO  %s\n' "$*"; }
die()  { printf 'STOP  %s\n' "$*"; exit 1; }
step() { printf '\n== %s\n' "$*"; }
mark() { printf '%s=%s\n' "$1" "$2" >> "$PENDING"; }
sqlv() { mariadb -N -B -e "$1"; }
sha_of() { sha256sum "$1" | cut -d' ' -f1; }
need_marker() {   # need_marker <name> : earlier batch evidence must exist and name this exact packet
  [ -s "$EVID/$1.pass" ] || die "missing evidence $EVID/$1.pass - run the earlier batch first"
  grep -q "^packet_sha=$PACKET_SHA$" "$EVID/$1.pass" || die "evidence $1.pass does not reference packet $PACKET_SHA"
}
marker_val() { grep "^$2=" "$EVID/$1.pass" | head -1 | cut -d= -f2-; }
trap 'rc=$?; printf "STOP  command failed (exit %s) at line %s: %s\n" "$rc" "$LINENO" "$BASH_COMMAND" >&2' ERR
