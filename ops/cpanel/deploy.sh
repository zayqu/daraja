#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/darajaco/repositories/daraja}"
RUNTIME_DIR="${RUNTIME_DIR:-$APP_DIR/runtime}"
STATE_DIR="${STATE_DIR:-/home/darajaco/.daraja-deploy}"
RELEASE_URL="${RELEASE_URL:-https://github.com/zayqu/daraja/releases/download/cpanel-production}"
APP_USER="${APP_USER:-$(id -un)}"
CLOUDLINUX_APP_ROOT="${CLOUDLINUX_APP_ROOT:-${APP_DIR#/home/$APP_USER/}}"
NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || true)}"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="/home/$APP_USER/nodevenv/$CLOUDLINUX_APP_ROOT/22/bin/node"
fi
HEALTHCHECK_ORIGIN="${HEALTHCHECK_ORIGIN:-https://ajira.daraja.co.tz}"
SECONDARY_HEALTHCHECK_ORIGIN="${SECONDARY_HEALTHCHECK_ORIGIN:-https://www.ajira.daraja.co.tz}"
STALE_WORKER_WAIT_SECONDS="${STALE_WORKER_WAIT_SECONDS:-5}"
CLOUDLINUX_SELECTOR="${CLOUDLINUX_SELECTOR:-$(command -v cloudlinux-selector 2>/dev/null || true)}"
if [[ -z "$CLOUDLINUX_SELECTOR" && -x /usr/sbin/cloudlinux-selector ]]; then
  CLOUDLINUX_SELECTOR="/usr/sbin/cloudlinux-selector"
fi

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

extract_frontend_asset_urls() {
  local html_file="$1"

  "$NODE_BIN" -e '
    const html = require("node:fs").readFileSync(process.argv[1], "utf8");
    const origin = new URL(process.argv[2]);
    const matches = html.matchAll(/<script[^>]+src=["\x27]([^"\x27]+)["\x27]/gi);
    const assets = new Set();
    for (const match of matches) {
      const candidate = new URL(match[1].replaceAll("&amp;", "&"), origin);
      if (candidate.origin === origin.origin && /^\/_next\/static\/.*\.js$/.test(candidate.pathname)) {
        assets.add(candidate.href);
      }
    }
    if (assets.size === 0) process.exit(1);
    process.stdout.write([...assets].sort().join("\n"));
  ' "$html_file" "$HEALTHCHECK_ORIGIN" 2>/dev/null
}

frontend_asset_healthcheck() {
  local page_file="$WORK_DIR/frontend-health.html"
  local asset_file="$WORK_DIR/frontend-health.js"
  local headers_file="$WORK_DIR/frontend-health.headers"
  local asset_urls
  local expected_asset_url
  local asset_path
  local installed_asset_file
  local content_type
  local attempt

  for attempt in 1 2 3 4 5; do
    if curl -fsSL --connect-timeout 10 --max-time 30 \
      -H "Cache-Control: no-cache" \
      -H "Pragma: no-cache" \
      "$HEALTHCHECK_ORIGIN/?daraja_release=$REMOTE_COMMIT&attempt=$attempt" \
      -o "$page_file"; then
      asset_urls="$(extract_frontend_asset_urls "$page_file" || true)"
      expected_asset_url="$(printf '%s\n' "$asset_urls" | grep -E '/_next/static/chunks/app/page-[^/]+\.js$' | head -n 1 || true)"
      if [[ -z "$expected_asset_url" ]]; then
        expected_asset_url="$(printf '%s\n' "$asset_urls" | head -n 1)"
      fi

      asset_path="$(
        "$NODE_BIN" -e '
          const candidate = new URL(process.argv[1]);
          if (!candidate.pathname.startsWith("/_next/static/")) process.exit(1);
          process.stdout.write(candidate.pathname.replace(/^\/_next\//, ""));
        ' "$expected_asset_url" 2>/dev/null || true
      )"
      installed_asset_file="$RUNTIME_DIR/.next/$asset_path"

      if [[ -n "$asset_path" && -s "$installed_asset_file" ]] && \
        curl -fsSL --connect-timeout 10 --max-time 30 \
          -D "$headers_file" \
          "$expected_asset_url" \
          -o "$asset_file" && \
        [[ -s "$asset_file" ]]; then
        content_type="$(awk 'BEGIN { IGNORECASE=1 } /^content-type:/ { value=$0 } END { sub(/^[^:]+:[[:space:]]*/, "", value); sub(/\r$/, "", value); print tolower(value) }' "$headers_file")"
        if [[ "$content_type" == application/javascript* || "$content_type" == text/javascript* ]] && \
          cmp -s "$asset_file" "$installed_asset_file"; then
          return 0
        fi
      fi
    fi

    if [[ "$attempt" -lt 5 ]]; then
      sleep 3
    fi
  done

  return 1
}

release_marker_healthcheck() {
  local origin="${1:-$HEALTHCHECK_ORIGIN}"
  local response_suffix="${2:-primary}"
  local url="$origin/api/health/release"
  local response_file="$WORK_DIR/release-health-$response_suffix.json"
  local attempt

  for attempt in 1 2 3 4 5; do
    if curl -fsSL --connect-timeout 10 --max-time 30 \
      -H "Accept: application/json" \
      -H "Cache-Control: no-cache" \
      -H "Pragma: no-cache" \
      "$url?daraja_release=$REMOTE_COMMIT&attempt=$attempt" \
      -o "$response_file" && \
      "$NODE_BIN" -e '
        const payload = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
        if (payload.status !== "ok" || payload.release !== process.argv[2]) process.exit(1);
      ' "$response_file" "$REMOTE_COMMIT"; then
      return 0
    fi
    if [[ "$attempt" -lt 5 ]]; then
      sleep 3
    fi
  done

  return 1
}

public_release_healthcheck() {
  frontend_asset_healthcheck &&
    release_marker_healthcheck "$HEALTHCHECK_ORIGIN" primary &&
    release_marker_healthcheck "$SECONDARY_HEALTHCHECK_ORIGIN" secondary
}

restart_application() {
  local action="$1"

  mkdir -p "$APP_DIR/tmp"
  touch "$APP_DIR/tmp/restart.txt"
  "$CLOUDLINUX_SELECTOR" "$action" \
    --json \
    --interpreter nodejs \
    --user "$APP_USER" \
    --app-root "$CLOUDLINUX_APP_ROOT"
}

registered_node_app_count() {
  "$CLOUDLINUX_SELECTOR" get \
    --json \
    --interpreter nodejs \
    --user "$APP_USER" | "$NODE_BIN" -e '
      let input = "";
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => {
        const payload = JSON.parse(input);
        const applications = new Set();
        for (const version of Object.values(payload.available_versions || {})) {
          const user = version?.users?.[process.argv[1]];
          for (const appRoot of Object.keys(user?.applications || {})) {
            applications.add(appRoot);
          }
        }
        process.stdout.write(String(applications.size));
      });
    ' "$APP_USER"
}

app_scoped_node_worker_pids() {
  local app_realpath
  local runtime_prefix
  local app_uid
  local candidate_pids
  local pid
  local worker_cwd

  app_realpath="$(readlink -f "$APP_DIR")"
  runtime_prefix="$app_realpath/runtime"
  app_uid="$(id -u "$APP_USER")"

  if ! command -v pgrep >/dev/null 2>&1; then
    return 1
  fi

  candidate_pids="$(
    {
      pgrep -u "$app_uid" -f '[l]snode' 2>/dev/null || true
      pgrep -u "$app_uid" -f '[n]ext-server' 2>/dev/null || true
    } | sort -u
  )"
  if [[ -z "$candidate_pids" ]]; then
    return 1
  fi

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    worker_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ "$worker_cwd" == "$app_realpath" ||           "$worker_cwd" == "$runtime_prefix" ||           "$worker_cwd" == "$runtime_prefix".* ]]; then
      printf '%s\n' "$pid"
    fi
  done <<< "$candidate_pids"
}

terminate_app_scoped_node_workers() {
  local pids
  local pid

  pids="$(app_scoped_node_worker_pids || true)"
  if [[ -z "$pids" ]]; then
    return 1
  fi

  printf 'Clearing stale Node worker(s) scoped to %s.\n' "$APP_DIR" >&2
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"
}

previous_runtime_worker_pids() {
  local previous_runtime
  local app_uid
  local candidate_pids
  local pid
  local worker_cwd

  previous_runtime="$(readlink -f "$APP_DIR/runtime.previous" 2>/dev/null || true)"
  app_uid="$(id -u "$APP_USER")"
  if [[ -z "$previous_runtime" || ! -d "$previous_runtime" ]] || ! command -v pgrep >/dev/null 2>&1; then
    return 1
  fi

  candidate_pids="$(pgrep -u "$app_uid" -f '[n]ext-server' 2>/dev/null || true)"
  if [[ -z "$candidate_pids" ]]; then
    return 1
  fi

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    worker_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ "$worker_cwd" == "$previous_runtime" || "$worker_cwd" == "$previous_runtime".* ]]; then
      printf '%s\n' "$pid"
    fi
  done <<< "$candidate_pids"
}

terminate_previous_runtime_workers() {
  local pids
  local pid

  pids="$(previous_runtime_worker_pids || true)"
  if [[ -z "$pids" ]]; then
    return 1
  fi

  printf 'Clearing stale Node worker(s) still attached to runtime.previous.\n' >&2
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"
}

recover_stale_litespeed_worker() {
  local registered_apps
  local app_uid

  printf 'Public frontend does not match the installed release; forcing an application-scoped restart.\n' >&2
  restart_application stop
  sleep "$STALE_WORKER_WAIT_SECONDS"
  restart_application start
  sleep "$STALE_WORKER_WAIT_SECONDS"

  if public_release_healthcheck; then
    return 0
  fi

  if terminate_app_scoped_node_workers; then
    sleep "$STALE_WORKER_WAIT_SECONDS"
    restart_application start
    sleep "$STALE_WORKER_WAIT_SECONDS"
    if public_release_healthcheck; then
      return 0
    fi
  fi

  registered_apps="$(registered_node_app_count 2>/dev/null || true)"
  if [[ "$registered_apps" != "1" ]]; then
    printf 'No Daraja-scoped stale Node worker could be safely identified; refusing account-wide cleanup because %s Node applications are registered.\n' \
      "${registered_apps:-an unknown number of}" >&2
    return 1
  fi

  if ! command -v pkill >/dev/null 2>&1; then
    printf 'pkill is required to clear a stale LiteSpeed lsnode worker.\n' >&2
    return 1
  fi

  app_uid="$(id -u "$APP_USER")"
  printf 'Clearing stale lsnode workers for the single registered Node application.\n' >&2
  pkill -u "$app_uid" -f '[l]snode' || true
  sleep "$STALE_WORKER_WAIT_SECONDS"
  restart_application start
  sleep "$STALE_WORKER_WAIT_SECONDS"
  public_release_healthcheck
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
      "$NODE_BIN" -e '
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
INSTALLED_COMMIT="$(cat "$RUNTIME_DIR/.next/.daraja-commit" 2>/dev/null || true)"

if [[ -n "$REMOTE_COMMIT" && "$REMOTE_COMMIT" == "$CURRENT_COMMIT" && "$REMOTE_COMMIT" == "$INSTALLED_COMMIT" ]]; then
  if [[ -n "$CLOUDLINUX_SELECTOR" && -x "$CLOUDLINUX_SELECTOR" ]]; then
    cd "$APP_DIR"

    if public_release_healthcheck && \
      healthcheck "$HEALTHCHECK_ORIGIN/jobs" && \
      jobs_api_healthcheck; then
      exit 0
    fi

    if recover_stale_litespeed_worker && \
      healthcheck "$HEALTHCHECK_ORIGIN/jobs" && \
      jobs_api_healthcheck; then
      exit 0
    fi
  fi

  printf 'Installed release markers match, but public health does not; reinstalling the verified release.\n' >&2
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

# cPanel is a thin runtime only. The verified release already contains the
# production server, generated Prisma client and runtime dependencies.
if ! [[ -n "$CLOUDLINUX_SELECTOR" && -x "$CLOUDLINUX_SELECTOR" ]]; then
  printf 'CloudLinux Node.js selector is required for a reliable restart.\n' >&2
  exit 1
fi

if [[ ! -d "$WORK_DIR/extracted/runtime" || ! -f "$WORK_DIR/extracted/runtime/server.js" ]]; then
  printf 'Verified release does not contain the expected standalone runtime.\n' >&2
  exit 1
fi

if [[ ! -f "$WORK_DIR/extracted/runtime/.next/.daraja-commit" ]]; then
  printf 'Verified release does not contain a release marker.\n' >&2
  exit 1
fi

BUNDLED_COMMIT="$(tr -d '\r\n' < "$WORK_DIR/extracted/runtime/.next/.daraja-commit")"
if [[ "$BUNDLED_COMMIT" != "$REMOTE_COMMIT" ]]; then
  printf 'Release marker mismatch: metadata=%s bundle=%s\n' "$REMOTE_COMMIT" "$BUNDLED_COMMIT" >&2
  exit 1
fi

cd "$APP_DIR"
rm -rf runtime.previous
if [[ -d runtime ]]; then
  mv runtime runtime.previous
fi
if [[ -f server.js ]]; then
  cp server.js server.js.previous
fi

mv "$WORK_DIR/extracted/runtime" runtime
cp "$WORK_DIR/extracted/server.js" server.js

mkdir -p tmp
restart_application restart
sleep "$STALE_WORKER_WAIT_SECONDS"
if terminate_previous_runtime_workers; then
  sleep 1
  restart_application start
  sleep "$STALE_WORKER_WAIT_SECONDS"
fi

HEALTHCHECK_FAILED=0
if ! public_release_healthcheck; then
  recover_stale_litespeed_worker || HEALTHCHECK_FAILED=1
fi
healthcheck "$HEALTHCHECK_ORIGIN/jobs" || HEALTHCHECK_FAILED=1
jobs_api_healthcheck || HEALTHCHECK_FAILED=1

if [[ "$HEALTHCHECK_FAILED" -ne 0 ]]; then
  FAILED_DIR="runtime.failed.$(date -u +%Y%m%dT%H%M%SZ)"
  mv runtime "$FAILED_DIR"
  if [[ -d runtime.previous ]]; then
    mv runtime.previous runtime
  fi
  if [[ -f server.js.previous ]]; then
    mv server.js.previous server.js
  fi
  restart_application restart
  printf 'Release health check failed; previous runtime restored. Failed runtime kept at %s/%s.\n' "$APP_DIR" "$FAILED_DIR" >&2
  exit 1
fi

printf '%s\n' "$REMOTE_COMMIT" > "$STATE_DIR/deployed.commit"
printf 'Deployed Daraja commit %s at %s\n' "$REMOTE_COMMIT" "$(date -u +%FT%TZ)"
