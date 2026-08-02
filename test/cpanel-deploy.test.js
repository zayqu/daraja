import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScript = await readFile(
  new URL("../ops/cpanel/deploy.sh", import.meta.url),
  "utf8",
);

test("cPanel deployment handles CloudLinux activation and restart safely", () => {
  assert.match(deployScript, /set \+u\nsource "\$VENV"\nset -u/);
  assert.match(deployScript, /cloudlinux-selector restart/);
  assert.match(deployScript, /--app-root "\$CLOUDLINUX_APP_ROOT"/);
});

test("cPanel deployment verifies the exact public build before recording success", () => {
  assert.match(deployScript, /\.next\/\.daraja-commit/);
  assert.match(deployScript, /for attempt in 1 2 3 4 5/);
  assert.match(deployScript, /curl -fsSL --connect-timeout 10 --max-time 30/);
  assert.match(deployScript, /_next\/static\/\$BUILD_ID\/_buildManifest\.js/);
  assert.match(deployScript, /"\$HEALTHCHECK_ORIGIN\/jobs"/);
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
