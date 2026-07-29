#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/darajaco/repositories/daraja}"
STATE_DIR="${STATE_DIR:-/home/darajaco/.daraja-deploy}"
RELEASE_URL="https://github.com/zayqu/daraja/releases/download/cpanel-production"
VENV="/home/darajaco/nodevenv/repositories/daraja/22/bin/activate"

mkdir -p "$STATE_DIR"
WORK_DIR="$(mktemp -d "$STATE_DIR/work.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

curl -fsSL --retry 3 --retry-delay 3   "$RELEASE_URL/daraja-cpanel-build.commit"   -o "$WORK_DIR/daraja-cpanel-build.commit"

REMOTE_COMMIT="$(tr -d '\r\n' < "$WORK_DIR/daraja-cpanel-build.commit")"
CURRENT_COMMIT="$(cat "$STATE_DIR/deployed.commit" 2>/dev/null || true)"

if [[ -n "$REMOTE_COMMIT" && "$REMOTE_COMMIT" == "$CURRENT_COMMIT" ]]; then
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
source "$VENV"
cd "$APP_DIR"

cp "$WORK_DIR/extracted/package.json" package.json
cp "$WORK_DIR/extracted/package-lock.json" package-lock.json
rm -rf prisma
cp -a "$WORK_DIR/extracted/prisma" prisma
cp "$WORK_DIR/extracted/prisma.config.ts" prisma.config.ts
cp "$WORK_DIR/extracted/next.config.mjs" next.config.mjs
npm install --omit=dev --no-audit --no-fund
npx prisma generate

rm -rf .next.previous
if [[ -d .next ]]; then
  mv .next .next.previous
fi

mv "$WORK_DIR/extracted/.next" .next
rm -rf public
mv "$WORK_DIR/extracted/public" public
cp "$WORK_DIR/extracted/server.js" server.js

mkdir -p tmp
touch tmp/restart.txt
printf '%s\n' "$REMOTE_COMMIT" > "$STATE_DIR/deployed.commit"
printf 'Deployed Daraja commit %s at %s\n' "$REMOTE_COMMIT" "$(date -u +%FT%TZ)"
