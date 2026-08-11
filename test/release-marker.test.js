import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readReleaseMarker } from "../lib/release-marker.js";

async function fixture(value) {
  const directory = await mkdtemp(join(tmpdir(), "daraja-release-"));
  await mkdir(join(directory, ".next"));
  await writeFile(join(directory, ".next", ".daraja-commit"), value, "utf8");
  return directory;
}

test("release marker exposes only a normalized full Git commit", async () => {
  const directory = await fixture(
    "A0643DDD611DA828B2CD0E78CE6CEB001990186C\n",
  );
  assert.equal(
    await readReleaseMarker(directory),
    "a0643ddd611da828b2cd0e78ce6ceb001990186c",
  );
});

test("release marker fails closed for missing or malformed values", async () => {
  const missing = await mkdtemp(join(tmpdir(), "daraja-release-missing-"));
  const short = await fixture("a0643ddd\n");
  const injected = await fixture(
    "a0643ddd611da828b2cd0e78ce6ceb001990186c secret\n",
  );

  assert.equal(await readReleaseMarker(missing), null);
  assert.equal(await readReleaseMarker(short), null);
  assert.equal(await readReleaseMarker(injected), null);
});

test("public release endpoint is dynamic, no-store and database-free", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(
      new URL("../app/api/health/release/route.js", import.meta.url),
      "utf8",
    ),
  );

  assert.match(source, /dynamic = "force-dynamic"/);
  assert.match(source, /Cache-Control": "no-store, max-age=0"/);
  assert.match(source, /status: "unavailable"/);
  assert.match(source, /status: 503/);
  assert.doesNotMatch(source, /prisma|DATABASE_URL|process\.env/);
});

