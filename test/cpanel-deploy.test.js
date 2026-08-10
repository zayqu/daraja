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

test("cPanel deployment handles CloudLinux activation and restart safely", () => {
  assert.match(deployScript, /set \+u\nsource "\$VENV"\nset -u/);
  assert.match(deployScript, /cloudlinux-selector restart/);
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
  assert.match(deployScript, /for attempt in 1 2 3 4 5/);
  assert.match(deployScript, /curl -fsSL --connect-timeout 10 --max-time 30/);
  assert.match(deployScript, /frontend_asset_healthcheck \\|\\| HEALTHCHECK_FAILED=1/);
  assert.match(deployScript, /candidate\\.origin === origin\\.origin/);
  assert.match(deployScript, /application\\/javascript/);
  assert.doesNotMatch(deployScript, /_buildManifest\\.js/);
  assert.match(deployScript, /"\$HEALTHCHECK_ORIGIN\/jobs"/);
  assert.match(deployScript, /jobs_api_healthcheck \|\| HEALTHCHECK_FAILED=1/);
  assert.match(deployScript, /Array\.isArray\(payload\.jobs\)/);
  assert.match(deployScript, /Number\.isFinite\(payload\.pagination\.total\)/);
  assert.ok(
    deployScript.indexOf("HEALTHCHECK_FAILED") <
      deployScript.indexOf('> "$STATE_DIR/deployed.commit"'),
  );
});

test("cPanel deployment automatically restores the previous frontend on failure", () => {
  assert.match(deployScript, /mv \.next \/?"?\$FAILED_DIR"?/);
  assert.match(deployScript, /mv \.next\.previous \.next/);
  assert.match(deployScript, /mv public\.previous public/);
  assert.match(deployScript, /mv server\.js\.previous server\.js/);
  assert.doesNotMatch(deployScript, /prisma (?:migrate|db push)/);
});

test("cPanel release securely bootstraps the current deploy runner", () => {
  assert.match(releaseWorkflow, /sha256sum daraja-cpanel-deploy\.sh/);
  assert.match(releaseWorkflow, /daraja-cpanel-deploy\.sha256/);
  assert.match(
    releaseWorkflow,
    /appleboy\/ssh-action@0ff4204d59e8e51228ff73bce53f80d53301dee2/,
  );
  assert.match(
    releaseWorkflow,
    /fingerprint: \$\{\{ secrets\.CPANEL_SSH_HOST_FINGERPRINT \}\}/,
  );
  assert.match(releaseWorkflow, /sha256sum -c daraja-cpanel-deploy\.sha256/);
  assert.match(releaseWorkflow, /bash -n daraja-cpanel-deploy\.sh/);
  assert.match(releaseWorkflow, /install -m 0755/);
  assert.match(releaseWorkflow, /\/bin\/bash "\$app_dir\/ops\/cpanel\/deploy\.sh"/);
  assert.doesNotMatch(releaseWorkflow, /appleboy\/ssh-action@v\d/);
});
