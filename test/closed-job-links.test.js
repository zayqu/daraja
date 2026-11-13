import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const read = (file) => readFile(path.join(process.cwd(), file), "utf8");

test("closed vacancies keep their URL and show alternatives instead of a bare 404", async () => {
  const loader = await read("lib/public-job.js");
  const page = await read("app/jobs/[id]/page.js");
  const layout = await read("app/jobs/[id]/layout.js");
  const notice = await read("components/ClosedJobNotice.js");

  assert.match(loader, /export async function findClosedPublicJob/);
  assert.match(loader, /moderationStatus: "PUBLISHED"/);
  assert.match(loader, /\{ active: false \}, \{ deadline: null \}, \{ deadline: \{ lt: new Date\(\) \} \}/);
  assert.match(page, /findClosedPublicJob\(id\)/);
  assert.match(page, /<ClosedJobNotice job=\{closedJob\} \/>/);
  assert.match(page, /notFound\(\)/);
  assert.match(layout, /Closed: \$\{closedJob\.title\}/);
  assert.match(layout, /robots: \{ index: false, follow: true \}/);
  assert.match(notice, /This job has closed/);
  assert.match(notice, /Application deadline: \$\{closedOn\}/);
  assert.doesNotMatch(notice, /Closed \$\{closedOn\}/);
  assert.match(notice, /\/jobs\?category=/);
  assert.doesNotMatch(notice, /applicationUrl|sourceUrl/);
});

test("unknown URLs use the branded not-found page, hidden from search", async () => {
  const notFound = await read("app/not-found.js");
  assert.match(notFound, /import ContentPage/);
  assert.match(notFound, /index: false/);
  assert.match(notFound, /href="\/jobs"/);
  assert.match(notFound, /href="\/career-guides"/);
});
