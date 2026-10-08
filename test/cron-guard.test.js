import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const deployScript = await readFile(new URL("../ops/cpanel/deploy.sh", import.meta.url), "utf8");
const start = deployScript.indexOf("CRON_GUARD_DISABLED_FILE=");
const end = deployScript.indexOf('mkdir -p "$STATE_DIR"\nWORK_DIR=');
const guard = deployScript.slice(start, end);

async function sandbox(initialCrontab, { withMzh = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "cron-guard-"));
  const home = path.join(root, "home");
  const state = path.join(home, ".daraja-deploy");
  const bin = path.join(root, "bin");
  await mkdir(state, { recursive: true });
  await mkdir(bin);
  if (withMzh) {
    await mkdir(path.join(home, "mzh", "ops", "cpanel"), { recursive: true });
    const backup = path.join(home, "mzh", "ops", "cpanel", "mzh-backup-local.sh");
    await writeFile(backup, "#!/bin/sh\n");
    await chmod(backup, 0o755);
  }
  const store = path.join(root, "crontab.txt");
  if (initialCrontab !== null) await writeFile(store, initialCrontab);
  await writeFile(
    path.join(bin, "crontab"),
    `#!/bin/sh\nif [ "$1" = "-l" ]; then [ -f "${store}" ] || exit 1; cat "${store}"; else cp "$1" "${store}"; fi\n`
  );
  await chmod(path.join(bin, "crontab"), 0o755);
  const run = () =>
    execFileSync("bash", ["-c", `set -Eeuo pipefail\n${guard}\nensure_required_cron`], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, STATE_DIR: state, CRON_GUARD_HOME: home },
      encoding: "utf8",
    });
  const read = async () => readFile(store, "utf8").catch(() => "");
  return { home, state, run, read };
}

test("guard restores every required job into an empty crontab", async () => {
  const box = await sandbox(null);
  box.run();
  const lines = (await box.read()).trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /\*\/5 \* \* \* \* \/bin\/bash .*auto-deploy\.sh/);
  assert.match(lines[1], /php artisan schedule:run/);
  assert.match(lines[2], /^0 0 \* \* \* .*mzh-backup-local\.sh/);
});

test("guard keeps unrelated jobs, backs up, and is idempotent", async () => {
  const other = "15 6 * * * /home/x/run-health-import.sh >> /home/x/log 2>&1";
  const box = await sandbox(`MAILTO=""\n${other}\n`);
  box.run();
  const once = await box.read();
  assert.ok(once.startsWith(`MAILTO=""\n${other}\n`));
  assert.ok((await readdir(box.state)).some((name) => name.startsWith("crontab.before-guard-")));
  box.run();
  assert.equal(await box.read(), once);
  assert.equal((once.match(/auto-deploy\.sh/g) || []).length, 1);
});

test("guard skips MZH jobs when MZH is not installed and honours the off switch", async () => {
  const box = await sandbox("", { withMzh: false });
  box.run();
  const content = await box.read();
  assert.match(content, /auto-deploy\.sh/);
  assert.doesNotMatch(content, /mzh/);

  const paused = await sandbox("");
  await writeFile(path.join(paused.state, "cron-guard.disabled"), "");
  assert.match(paused.run(), /disabled/);
  assert.equal(await paused.read(), "");
});

test("deploy runs the guard without letting it block a release", () => {
  assert.match(deployScript, /ensure_required_cron \|\| printf/);
});

test("production watchdog checks deploy freshness, uptime and AdSense files on a schedule", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/production-watchdog.yml", import.meta.url),
    "utf8"
  );
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /api\/health\/release/);
  assert.match(workflow, /daraja-cpanel-build\.commit/);
  assert.match(workflow, /ads\.txt/);
  assert.match(workflow, /google-adsense-account/);
  assert.match(workflow, /permissions:\n  contents: read/);
});

test("deploy script avoids process substitution, which cPanel cron shells cannot run", () => {
  const code = deployScript
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(code, /<\s*<\(/);
});
