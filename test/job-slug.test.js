const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const {
  MAX_SLUG_BASE_LENGTH,
  createJobSlug,
  slugify,
} = require("../lib/job-slug");
const { saveJobs } = require("../scraper/lib/store");

test("job slugs are readable, normalized and deterministic", () => {
  const input = {
    title: "Finance Manager, Group Functions",
    company: "Stanbic Bank Tanzania",
    identity: "ajiraweb:standardbank-123",
  };

  const slug = createJobSlug(input);

  assert.match(
    slug,
    /^finance-manager-group-functions-at-stanbic-bank-tanzania-[a-f0-9]{12}$/
  );
  assert.equal(slug, createJobSlug(input));
  assert.equal(slugify("ICT & Digital—Services"), "ict-and-digital-services");
});

test("job slug bases are bounded and identities prevent title collisions", () => {
  const title = "Senior ".repeat(40) + "Manager";
  const first = createJobSlug({
    title,
    company: "Daraja",
    identity: "source:1",
  });
  const second = createJobSlug({
    title,
    company: "Daraja",
    identity: "source:2",
  });

  assert.ok(first.length <= MAX_SLUG_BASE_LENGTH + 13);
  assert.notEqual(first, second);
  assert.throws(
    () => createJobSlug({ title: "Analyst", company: "Daraja" }),
    /stable job identity/
  );
});

test("slug migration backfills every job before enforcing uniqueness", async () => {
  const migration = await readFile(
    path.join(
      __dirname,
      "..",
      "prisma/migrations/20260728090000_immutable_job_slugs/migration.sql"
    ),
    "utf8"
  );

  assert.match(migration, /UPDATE "Job"/);
  assert.match(migration, /ALTER COLUMN "slug" SET NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "Job_slug_key"/);
});

test("legacy job IDs receive a permanent redirect to the canonical slug", async () => {
  const layout = await readFile(
    path.join(__dirname, "..", "app/jobs/[id]/layout.js"),
    "utf8"
  );

  assert.match(layout, /permanentRedirect\(`\/jobs\/\$\{job\.slug\}`\)/);
  assert.match(layout, /\{ id: identifier \}/);
  assert.match(layout, /\{ slug: identifier \}/);
});

test("scraped jobs receive a slug once and updates never rewrite it", async () => {
  const creates = [];
  const updates = [];
  let existing = null;
  const prisma = {
    job: {
      findFirst: async () => existing,
      create: async (payload) => creates.push(payload),
      update: async (payload) => updates.push(payload),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const job = {
    sourceId: "vacancy-42",
    title: "Credit Analyst",
    company: "Akiba Commercial Bank",
    deadline: new Date("2099-07-31T23:59:59.000Z"),
    active: true,
  };

  await saveJobs(prisma, [job], "ajiraweb");
  assert.match(
    creates[0].data.slug,
    /^credit-analyst-at-akiba-commercial-bank-[a-f0-9]{12}$/
  );

  existing = { id: "existing-job" };
  await saveJobs(prisma, [{ ...job, title: "Senior Credit Analyst" }], "ajiraweb");
  assert.equal(Object.hasOwn(updates[0].data, "slug"), false);
});
