const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function source(relative) {
  return readFile(path.join(__dirname, "..", relative), "utf8");
}

test("every job category has its own homepage icon", async () => {
  const categories = await source("lib/job-categories.js");
  const icons = await source("components/CategoryIcon.js");
  const block = categories.slice(
    categories.indexOf("JOB_CATEGORIES"),
    categories.indexOf("];")
  );
  const names = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(names.length >= 20);
  for (const name of names) {
    const key = /^[A-Za-z]+$/.test(name) ? `${name}:` : `"${name}":`;
    assert.ok(icons.includes(key), `missing icon for ${name}`);
  }
});

test("homepage categories show live counts, busiest first", async () => {
  const home = await source("app/page.js");
  const stats = await source("lib/home-stats.js");
  assert.match(stats, /groupBy\(\{\s*by: \["category"\]/);
  assert.match(stats, /categoryCounts: \{\}/);
  assert.match(home, /orderCategories\(categoryList, stats\.categoryCounts\)/);
  assert.match(home, /<CategoryIcon category=\{name\} slug=\{slug\} \/>/);
  assert.match(home, /formatOpenJobs\(count\)/);
});
