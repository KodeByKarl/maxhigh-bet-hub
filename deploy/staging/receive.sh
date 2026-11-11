#!/bin/bash
set -euo pipefail
umask 077
# Install this and receive.py root-owned under /usr/local/libexec; no sudo grants.
exec /usr/bin/timeout --signal=TERM --kill-after=45s 600s /usr/bin/python3 /usr/local/libexec/maxhigh-staging-receive.py
