import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScript = await readFile(
  new URL("../ops/cpanel/deploy.sh", import.meta.url),
  "utf8",
);
const releaseWorkflow = await readFile(
  new URL("../.github/workflows/cpanel-staging-build.yml", import.meta.url),
  "utf8",
);
const autoDeployScript = await readFile(
  new URL("../ops/cpanel/auto-deploy.sh", import.meta.url),
  "utf8",
);

test("cPanel deployment handles CloudLinux activation and restart safely", () => {
  assert.match(deployScript, /set \+u\nsource "\$VENV"\nset -u/);
  assert.match(deployScript, /restart_application restart/);
  assert.match(deployScript, /--app-root "\$CLOUDLINUX_APP_ROOT"/);
});

test("cPanel deployment normalizes CloudLinux node_modules without deleting it", () => {
  assert.match(deployScript, /VENV_NODE_MODULES=/);
  assert.match(deployScript, /ensure_cloudlinux_node_modules/);
  assert.match(deployScript, /readlink -f "\$app_node_modules"/);
  assert.match(deployScript, /node_modules\.before-cloudlinux/);
  assert.match(deployScript, /mv "\$app_node_modules" "\$backup_path"/);
  assert.match(deployScript, /ln -s "\$VENV_NODE_MODULES" "\$app_node_modules"/);
  assert.doesNotMatch(deployScript, /rm -rf (?:"?\$APP_DIR\/)?node_modules/);
});

test("cPanel deployment verifies the exact public build before recording success", () => {
  assert.match(deployScript, /\.next\/\.daraja-commit/);
  assert.match(deployScript, /\.next\/server\/app\/index\.html/);
  assert.match(deployScript, /for attempt in 1 2 3 4 5/);
  assert.match(deployScript, /curl -fsSL --connect-timeout 10 --max-time 30/);
  assert.match(deployScript, /asset_urls" == "\$expected_asset_urls/);
  assert.match(deployScript, /chunks\/app\/page-/);
  assert.match(deployScript, /Cache-Control: no-cache/);
  assert.match(deployScript, /release_marker_healthcheck/);
  assert.match(deployScript, /\/api\/health\/release/);
  assert.match(deployScript, /payload\.release !== process\.argv\[2\]/);
  assert.match(deployScript, /public_release_healthcheck/);
  assert.match(deployScript, /recover_stale_litespeed_worker \|\| HEALTHCHECK_FAILED=1/);
  assert.match(deployScript, /candidate\.origin === origin\.origin/);
  assert.match(deployScript, /application\/javascript/);
  assert.doesNotMatch(deployScript, /_buildManifest\.js/);
  assert.match(deployScript, /"\$HEALTHCHECK_ORIGIN\/jobs"/);
  assert.match(deployScript, /jobs_api_healthcheck \|\| HEALTHCHECK_FAILED=1/);
  assert.match(deployScript, /Array\.isArray\(payload\.jobs\)/);
  assert.match(deployScript, /Number\.isFinite\(payload\.pagination\.total\)/);
  assert.ok(
    deployScript.indexOf("HEALTHCHECK_FAILED") <
      deployScript.indexOf('> "$STATE_DIR/deployed.commit"'),
  );
});

test("cPanel deployment recovers a stale LiteSpeed worker with bounded scope", () => {
  assert.match(deployScript, /restart_application stop/);
  assert.match(deployScript, /restart_application start/);
  assert.match(deployScript, /registered_node_app_count/);
  assert.match(deployScript, /registered_apps" != "1/);
  assert.match(deployScript, /pkill -u "\$app_uid" -f '\[l\]snode'/);
  assert.match(deployScript, /touch "\$APP_DIR\/tmp\/restart\.txt"/);
  assert.match(
    deployScript,
    /REMOTE_COMMIT" == "\$CURRENT_COMMIT"[\s\S]+public_release_healthcheck/,
  );
  assert.doesNotMatch(deployScript, /pkill (?:node|-f ['"]?lsnode)/);
});

test("cPanel deployment automatically restores the previous frontend on failure", () => {
  assert.match(deployScript, /mv \.next \/?"?\$FAILED_DIR"?/);
  assert.match(deployScript, /mv \.next\.previous \.next/);
  assert.match(deployScript, /mv public\.previous public/);
  assert.match(deployScript, /mv server\.js\.previous server\.js/);
  assert.doesNotMatch(deployScript, /prisma (?:migrate|db push)/);
});

test("cPanel release publishes the verified outbound pull runners", () => {
  assert.match(releaseWorkflow, /sha256sum daraja-cpanel-deploy\.sh/);
  assert.match(releaseWorkflow, /daraja-cpanel-deploy\.sha256/);
  assert.match(releaseWorkflow, /daraja-cpanel-auto-deploy\.sh/);
  assert.match(releaseWorkflow, /daraja-cpanel-auto-deploy\.sha256/);
  assert.match(releaseWorkflow, /bash -n ops\/cpanel\/auto-deploy\.sh/);
  assert.match(releaseWorkflow, /cancel-in-progress: false/);
  assert.match(releaseWorkflow, /gh release upload cpanel-production/);
  assert.match(releaseWorkflow, /Hand off release to cPanel pull deployer/);
  assert.doesNotMatch(releaseWorkflow, /appleboy\/ssh-action/);
  assert.doesNotMatch(releaseWorkflow, /CPANEL_SSH_/);
});

test("cPanel pull deployer fails closed and verifies the runner before install", () => {
  assert.match(autoDeployScript, /set -Eeuo pipefail/);
  assert.match(autoDeployScript, /command -v flock/);
  assert.match(autoDeployScript, /flock -n 9/);
  assert.match(autoDeployScript, /mktemp -d "\$STATE_DIR\/bootstrap\.XXXXXX"/);
  assert.match(autoDeployScript, /sha256sum -c daraja-cpanel-deploy\.sha256/);
  assert.match(autoDeployScript, /bash -n daraja-cpanel-deploy\.sh/);
  assert.match(autoDeployScript, /--connect-timeout 10 --max-time 60/);
  assert.doesNotMatch(autoDeployScript, /--retry-all-errors/);
  assert.match(
    autoDeployScript,
    /install -m 0755 "\$work_dir\/daraja-cpanel-deploy\.sh" "\$APP_DIR\/ops\/cpanel\/deploy\.sh"/,
  );
  assert.ok(
    autoDeployScript.indexOf("sha256sum -c") <
      autoDeployScript.indexOf("install -m 0755"),
  );
  assert.match(autoDeployScript, /\/bin\/bash "\$APP_DIR\/ops\/cpanel\/deploy\.sh"/);
  assert.doesNotMatch(autoDeployScript, /prisma (?:migrate|db push)/);
  assert.doesNotMatch(autoDeployScript, /(?:GH_TOKEN|GITHUB_TOKEN|CPANEL_SSH_)/);
});
