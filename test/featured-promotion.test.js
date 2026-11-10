const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const read = (file) => readFile(path.join(__dirname, "..", file), "utf8");

async function loadParseFeaturedUntil() {
  const source = await read("lib/admin-job-input.js");
  const start = source.indexOf("export function parseFeaturedUntil");
  assert.ok(start > -1, "parseFeaturedUntil exists");
  const body = source.slice(start).replace("export function", "function");
  const end = body.indexOf("\n}\n") + 2;
  return new Function(`${body.slice(0, end)}; return parseFeaturedUntil;`)();
}

test("featured-until date features a job to the end of that day in Tanzania time", async () => {
  const parse = await loadParseFeaturedUntil();
  const now = new Date("2026-11-10T09:00:00+03:00");
  const result = parse({ featuredUntil: "2026-11-24" }, [], now);
  assert.equal(result.featured, true);
  assert.equal(result.featuredUntil.toISOString(), "2026-11-24T20:59:59.000Z");
});

test("clearing the date removes the badge; a past date is stored but not featured", async () => {
  const parse = await loadParseFeaturedUntil();
  const now = new Date("2026-11-10T09:00:00+03:00");
  assert.deepEqual(parse({ featuredUntil: "" }, [], now), { featured: false, featuredUntil: null });
  assert.equal(parse({ featuredUntil: "2026-11-01" }, [], now).featured, false);
});

test("absent field leaves featured state alone and bad dates are rejected", async () => {
  const parse = await loadParseFeaturedUntil();
  assert.deepEqual(parse({}, []), {});
  const problems = [];
  assert.deepEqual(parse({ featuredUntil: "24/11/2026" }, problems), {});
  assert.equal(problems.length, 1);
});

test("featured placements expire automatically and the schema change is additive", async () => {
  const store = await read("scraper/lib/store.js");
  const run = await read("scraper/run.js");
  const schema = await read("prisma/schema.prisma");
  const migration = await read("prisma/migrations/20261110090000_job_featured_until/migration.sql");
  assert.match(store, /async function expireFeaturedJobs/);
  assert.match(store, /where: \{ featured: true, featuredUntil: \{ lt: now \} \}/);
  assert.match(store, /data: \{ featured: false \}/);
  assert.match(run, /await expireFeaturedJobs\(prisma\)/);
  assert.match(schema, /featuredUntil\s+DateTime\?/);
  assert.match(migration, /ADD COLUMN "featuredUntil" TIMESTAMP\(3\)/);
  assert.doesNotMatch(migration, /DROP|DELETE|UPDATE/i);
});

test("admins set the featured date on the job form and promotion details in settings", async () => {
  const form = await read("components/admin/JobForm.js");
  const page = await read("app/admin/jobs/[id]/page.js");
  const settings = await read("app/admin/settings/page.js");
  const features = await read("lib/features.js");
  assert.match(form, /id="job-featured-until"/);
  assert.match(page, /featuredUntil: job\.featured \? deadlineInputValue\(job\.featuredUntil\) : ""/);
  for (const key of ["promo.price", "promo.days", "promo.whatsapp", "promo.lipaNamba", "promo.lipaName"]) {
    assert.match(features, new RegExp(`"${key.replace(".", "\\.")}"`));
    assert.match(settings, new RegExp(`"${key.replace(".", "\\.")}"`));
  }
});

async function loadParseValue() {
  const source = await read("app/api/admin/settings/route.js");
  const sender = source.match(/const SENDER = (.*);/)[1];
  const start = source.indexOf("function parseValue");
  const body = source.slice(start);
  const end = body.indexOf("\n}\n") + 2;
  return new Function(`const SENDER = ${sender}; ${body.slice(0, end)}; return parseValue;`)();
}

test("each text setting is validated by its own format, not as an email", async () => {
  const parse = await loadParseValue();
  assert.deepEqual(parse({ type: "text", format: "phone" }, "+255745990159"), { value: "255745990159" });
  assert.deepEqual(parse({ type: "text", format: "phone" }, "+255 745 990 159"), { value: "255745990159" });
  assert.ok(parse({ type: "text", format: "phone" }, "call me").error);
  assert.deepEqual(parse({ type: "text", format: "digits" }, "5123 456"), { value: "5123456" });
  assert.ok(parse({ type: "text", format: "digits" }, "LIPA12").error);
  assert.deepEqual(parse({ type: "text", format: "plain" }, "DARAJA DIGITAL"), { value: "DARAJA DIGITAL" });
  assert.ok(parse({ type: "text", format: "email" }, "not an email").error);
  assert.deepEqual(parse({ type: "text", format: "email" }, "Daraja <no-reply@daraja.co.tz>"), { value: "Daraja <no-reply@daraja.co.tz>" });
  assert.deepEqual(parse({ type: "text", format: "phone" }, ""), { value: "" });
  assert.equal(parse({ type: "number" }, "abc").error, "Enter a whole number");
});

test("every text setting declares a validation format", async () => {
  const features = await read("lib/features.js");
  for (const key of ["email.accountFrom", "promo.whatsapp", "promo.lipaNamba", "promo.lipaName"]) {
    const block = features.slice(features.indexOf(`"${key}": {`)).split("\n  },")[0];
    assert.match(block, /format: "(email|phone|digits|plain)"/, key);
  }
});
