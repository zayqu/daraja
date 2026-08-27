#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/darajaco/repositories/daraja}"
STATE_DIR="${STATE_DIR:-/home/darajaco/.daraja-deploy}"
RELEASE_URL="${RELEASE_URL:-https://github.com/zayqu/daraja/releases/download/cpanel-production}"
LOCK_FILE="$STATE_DIR/auto-deploy.lock"
LOG_PREFIX="[daraja-auto-deploy]"

mkdir -p "$APP_DIR/ops/cpanel" "$STATE_DIR"

if ! command -v flock >/dev/null 2>&1; then
  printf '%s flock is required.\n' "$LOG_PREFIX" >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  printf '%s another deployment is already running; skipping.\n' "$LOG_PREFIX"
  exit 0
fi

work_dir="$(mktemp -d "$STATE_DIR/bootstrap.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT

curl -fsSL --retry 3 \
  --connect-timeout 10 --max-time 60 \
  "$RELEASE_URL/daraja-cpanel-deploy.sh" \
  -o "$work_dir/daraja-cpanel-deploy.sh"
curl -fsSL --retry 3 \
  --connect-timeout 10 --max-time 60 \
  "$RELEASE_URL/daraja-cpanel-deploy.sha256" \
  -o "$work_dir/daraja-cpanel-deploy.sha256"

(
  cd "$work_dir"
  sha256sum -c daraja-cpanel-deploy.sha256
  bash -n daraja-cpanel-deploy.sh
)

install -m 0755 "$work_dir/daraja-cpanel-deploy.sh" "$APP_DIR/ops/cpanel/deploy.sh"
printf '%s checking verified production release.\n' "$LOG_PREFIX"
/bin/bash "$APP_DIR/ops/cpanel/deploy.sh"
