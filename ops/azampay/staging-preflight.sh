#!/usr/bin/env bash
# Read-only staging eligibility check. Does not allocate a process, create
# directories, apply migrations, restart workers or read/write secrets.
set -Eeuo pipefail

TARGET_USER="${STAGING_ACCOUNT_USER:-darajaco}"
MAX_PROCESS_SLOTS=100
# Conservative headroom for existing Ajira/MZH/THA runtimes on shared cPanel.
MAX_BASELINE_THREADS=55
MIN_AVAILABLE_DISK_KB=2097152
MIN_AVAILABLE_MEMORY_KB=524288

fail=0
warn() { printf 'BLOCKED: %s\n' "$*" >&2; fail=1; }
note() { printf 'CHECK: %s\n' "$*"; }

if [[ "$(id -un)" != "$TARGET_USER" ]]; then
  warn "Run only as expected cPanel account ($TARGET_USER), not as root or another user."
fi

if ! command -v ps >/dev/null 2>&1; then
  warn 'ps missing; cannot establish process/thread baseline'
else
  threads="$(ps -L -u "$TARGET_USER" --no-headers 2>/dev/null | wc -l | tr -d ' ')"
  note "Account threads/process slots in use: $threads / $MAX_PROCESS_SLOTS"
  if ! [[ "$threads" =~ ^[0-9]+$ ]] || (( threads > MAX_BASELINE_THREADS )); then
    warn "Current baseline exceeds $MAX_BASELINE_THREADS slots; do NOT provision additional Node runtime"
  fi
fi

if command -v df >/dev/null 2>&1; then
  disk="$(df -Pk "$HOME" | awk 'NR==2 {print $4}')"
  note "Available disk: ${disk:-unknown} KiB"
  if ! [[ "$disk" =~ ^[0-9]+$ ]] || (( disk < MIN_AVAILABLE_DISK_KB )); then
    warn "Less than 2 GiB available; do NOT prepare a staging runtime"
  fi
else
  warn 'df missing; cannot establish disk capacity'
fi

# /proc/meminfo is system-wide: passing is NOT a guarantee CloudLinux LVE
# memory allocation is available. A separate cPanel LVE resource check is mandatory.
if [[ -r /proc/meminfo ]]; then
  mem="$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)"
  note "System available memory: ${mem:-unknown} KiB (not cPanel LVE limit)"
  if ! [[ "$mem" =~ ^[0-9]+$ ]] || (( mem < MIN_AVAILABLE_MEMORY_KB )); then
    warn 'Host system memory below 512 MiB'
  fi
else
  warn 'Memory availability not measurable'
fi

if ! command -v node >/dev/null 2>&1; then
  warn 'Node executable unavailable in current shell'
else
  note "Node binary available: $(node -v)"
fi

if ! command -v psql >/dev/null 2>&1; then
  note 'PostgreSQL client unavailable (requires separate DB availability check)'
fi

# Intentionally do not read DATABASE_URL, .env, cron, server app secrets,
# payment credentials, or touch live application state.
note 'Isolation prerequisites still need manual confirmation:'
note '  [ ] staging-only domain with TLS and AzamPay callback registration'
note '  [ ] staging-only PostgreSQL DB and DB user, separate from Neon production'
note '  [ ] cPanel LVE memory/process and registered Node app limits checked'
note '  [ ] staging folder, node app registration and port NOT shared with Ajira'
note '  [ ] public job scraper, cron, production ads and outgoing notifications disabled'
note '  [ ] credentials rotated and inserted privately AFTER owner approves test'
note '  [ ] no real user PII or live vacancies in staging fixture'
if (( fail )); then
  note 'Result: INELIGIBLE for staging installation. Nothing was modified.'
  exit 2
fi
note 'Result: BASIC HOST CHECKS PASSED; this does NOT approve staging installation.'
