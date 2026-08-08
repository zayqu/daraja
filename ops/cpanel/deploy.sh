#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/darajaco/repositories/daraja}"
STATE_DIR="${STATE_DIR:-/home/darajaco/.daraja-deploy}"
RELEASE_URL="${RELEASE_URL:-https://github.com/zayqu/daraja/releases/download/cpanel-production}"
VENV="${VENV:-/home/darajaco/nodevenv/repositories/daraja/22/bin/activate}"
APP_USER="${APP_USER:-$(id -un)}"
CLOUDLINUX_APP_ROOT="${CLOUDLINUX_APP_ROOT:-${APP_DIR#/home/$APP_USER/}}"
HEALTHCHECK_ORIGIN="${HEALTHCHECK_ORIGIN:-https://www.ajira.daraja.co.tz}"

healthcheck() {
  local url="$1"
  local attempt

  for attempt in 1 2 3 4 5; do
    if curl -fsSL --connect-timeout 10 --max-time 30 "$url" -o /dev/null; then
      return 0
    fi
    if [[ "$attempt" -lt 5 ]]; then
      sleep 3
    fi
  done

  return 1
}

jobs_api_healthcheck() {
  local url="$HEALTHCHECK_ORIGIN/api/jobs?page=1&limit=1&status=active"
  local response_file="$WORK_DIR/jobs-api-health.json"
  local attempt

  for attempt in 1 2 3 4 5; do
    if curl -fsSL --connect-timeout 10 --max-time 30 \
      -H "Accept: application/json" \
      "$url" \
      -o "$response_file" && \
      node -e '
        const payload = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
        if (!Array.isArray(payload.jobs)) process.exit(1);
        if (!payload.pagination || !Number.isFinite(payload.pagination.total)) process.exit(1);
      ' "$response_file"; then
      return 0
    fi
    if [[ "$attempt" -lt 5 ]]; then
      sleep 3
    fi
  done

  return 1
}

mkdir -p "$STATE_DIR"
WORK_DIR="$(mktemp -d "$STATE_DIR/work.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

curl -fsSL --retry 3 --retry-delay 3   "$RELEASE_URL/daraja-cpanel-build.commit"   -o "$WORK_DIR/daraja-cpanel-build.commit"

REMOTE_COMMIT="$(tr -d '\r\n' < "$WORK_DIR/daraja-cpanel-build.commit")"
CURRENT_COMMIT="$(cat "$STATE_DIR/deployed.commit" 2>/dev/null || true)"
INSTALLED_COMMIT="$(cat "$APP_DIR/.next/.daraja-commit" 2>/dev/null || true)"

if [[ -n "$REMOTE_COMMIT" && "$REMOTE_COMMIT" == "$CURRENT_COMMIT" && "$REMOTE_COMMIT" == "$INSTALLED_COMMIT" ]]; then
  exit 0
fi

curl -fsSL --retry 3 --retry-delay 3   "$RELEASE_URL/daraja-cpanel-build.tar.gz"   -o "$WORK_DIR/daraja-cpanel-build.tar.gz"
curl -fsSL --retry 3 --retry-delay 3   "$RELEASE_URL/daraja-cpanel-build.sha256"   -o "$WORK_DIR/daraja-cpanel-build.sha256"

(
  cd "$WORK_DIR"
  sha256sum -c daraja-cpanel-build.sha256
  tar -tzf daraja-cpanel-build.tar.gz >/dev/null
  mkdir extracted
  tar -xzf daraja-cpanel-build.tar.gz -C extracted
)

# cPanel stores runtime packages in its Node virtual environment.
# Generate Prisma locally, but never run an unattended database migration.
if [[ ! -f "$VENV" ]]; then
  printf 'Node virtual environment was not found: %s\n' "$VENV" >&2
  exit 1
fi

if ! command -v cloudlinux-selector >/dev/null 2>&1; then
  printf 'CloudLinux Node.js selector is required for a reliable restart.\n' >&2
  exit 1
fi

# CloudLinux's activation script reads optional shell variables directly, so
# temporarily disable nounset while sourcing that trusted cPanel-owned file.
set +u
source "$VENV"
set -u
cd "$APP_DIR"

cp "$WORK_DIR/extracted/package.json" package.json
cp "$WORK_DIR/extracted/package-lock.json" package-lock.json
rm -rf prisma
cp -a "$WORK_DIR/extracted/prisma" prisma
cp "$WORK_DIR/extracted/prisma.config.ts" prisma.config.ts
cp "$WORK_DIR/extracted/next.config.mjs" next.config.mjs
# Prisma CLI is a development dependency, so it must remain available here.
# cPanel cannot compile the app, but generation itself is lightweight and safe.
npm install --include=dev --no-audit --no-fund
npx prisma generate

rm -rf .next.previous public.previous
if [[ -d .next ]]; then
  mv .next .next.previous
fi
if [[ -d public ]]; then
  mv public public.previous
fi
if [[ -f server.js ]]; then
  cp server.js server.js.previous
fi

mv "$WORK_DIR/extracted/.next" .next
mv "$WORK_DIR/extracted/public" public
cp "$WORK_DIR/extracted/server.js" server.js
printf '%s\n' "$REMOTE_COMMIT" > .next/.daraja-commit

mkdir -p tmp
cloudlinux-selector restart \
  --json \
  --interpreter nodejs \
  --user "$APP_USER" \
  --app-root "$CLOUDLINUX_APP_ROOT"

BUILD_ID="$(tr -d '\r\n' < .next/BUILD_ID)"
HEALTHCHECK_FAILED=0
healthcheck "$HEALTHCHECK_ORIGIN/_next/static/$BUILD_ID/_buildManifest.js" || HEALTHCHECK_FAILED=1
healthcheck "$HEALTHCHECK_ORIGIN/jobs" || HEALTHCHECK_FAILED=1
jobs_api_healthcheck || HEALTHCHECK_FAILED=1

if [[ "$HEALTHCHECK_FAILED" -ne 0 ]]; then
  FAILED_DIR=".next.failed.$(date -u +%Y%m%dT%H%M%SZ)"
  mv .next "$FAILED_DIR"
  if [[ -d .next.previous ]]; then
    mv .next.previous .next
  fi
  rm -rf public
  if [[ -d public.previous ]]; then
    mv public.previous public
  fi
  if [[ -f server.js.previous ]]; then
    mv server.js.previous server.js
  fi
  cloudlinux-selector restart \
    --json \
    --interpreter nodejs \
    --user "$APP_USER" \
    --app-root "$CLOUDLINUX_APP_ROOT"
  printf 'Release health check failed; previous build restored. Failed build kept at %s/%s.\n' "$APP_DIR" "$FAILED_DIR" >&2
  exit 1
fi

printf '%s\n' "$REMOTE_COMMIT" > "$STATE_DIR/deployed.commit"
printf 'Deployed Daraja commit %s at %s\n' "$REMOTE_COMMIT" "$(date -u +%FT%TZ)"
