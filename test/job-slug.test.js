const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const {
  MAX_SLUG_BASE_LENGTH,
  createJobSlug,
  createMigratedJobSlug,
  createJobWithPositionSlug,
  createPositionSlug,
  createUniquePositionSlug,
  slugify,
} = require("../lib/job-slug");
const { saveJobs } = require("../scraper/lib/store");
const { findJobByLegacySlug } = require("../lib/legacy-job-slug");
const { normalizeJobSlugs } = require("../scripts/normalize-job-slugs");

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

test("public job URLs use only the position unless a real collision exists", async () => {
  const seen = new Set();
  const prisma = {
    job: {
      findFirst: async ({ where }) => seen.has(where.slug) ? { id: "taken" } : null,
    },
  };

  assert.equal(createPositionSlug("Associate WASH Officer"), "associate-wash-officer");
  assert.equal(
    await createUniquePositionSlug(prisma, {
      title: "Associate WASH Officer",
      company: "UNHCR",
      identity: "one",
    }),
    "associate-wash-officer"
  );

  seen.add("associate-wash-officer");
  assert.equal(
    await createUniquePositionSlug(prisma, {
      title: "Associate WASH Officer",
      company: "UNHCR",
      identity: "two",
    }),
    "associate-wash-officer-at-unhcr"
  );
});

test("concurrent title collisions retry with the professional fallback URL", async () => {
  let creates = 0;
  const saved = new Set();
  const prisma = {
    job: {
      findFirst: async ({ where }) => saved.has(where.slug) ? { id: "taken" } : null,
      create: async ({ data }) => {
        creates += 1;
        if (creates === 1) {
          saved.add(data.slug);
          const error = new Error("Unique constraint");
          error.code = "P2002";
          throw error;
        }
        saved.add(data.slug);
        return data;
      },
    },
  };
  const job = await createJobWithPositionSlug(
    prisma,
    { title: "Accountant", company: "Beta Ltd" },
    "beta:1"
  );
  assert.equal(job.slug, "accountant-at-beta-ltd");
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

test("the first readable URL format remains resolvable after normalization", async () => {
  const job = {
    id: "cms4mfki30001uz4sw86lin69",
    source: "ajira",
    sourceId: "vacancy-42",
    title: "Associate WASH Officer",
    company: "United Nations High Commissioner for Refugees",
    slug: "associate-wash-officer",
    active: true,
  };
  const oldSlug = createMigratedJobSlug({
    title: job.title,
    company: job.company,
    id: job.id,
  });
  const prisma = { job: { findMany: async () => [job] } };
  assert.equal(
    (await findJobByLegacySlug(prisma, oldSlug, { slug: true })).id,
    job.id
  );
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
    /^credit-analyst$/
  );

  existing = { id: "existing-job" };
  await saveJobs(prisma, [{ ...job, title: "Senior Credit Analyst" }], "ajiraweb");
  assert.equal(Object.hasOwn(updates[0].data, "slug"), false);
});

test("NMB updates legacy source records using the canonical source identity", async () => {
  const updates = [];
  const prisma = {
    job: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where.source, {
          in: ["nmb-bank-careers", "nmb-bank"],
        });
        return { id: "legacy-nmb-job" };
      },
      update: async (payload) => updates.push(payload),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const job = {
    source: "nmb-bank-careers",
    sourceId: "nmb-credit-analyst",
    title: "Credit Analyst",
    company: "NMB Bank Plc",
    deadline: new Date("2099-07-31T23:59:59.000Z"),
    active: true,
  };

  const summary = await saveJobs(prisma, [job], "nmb-bank-careers");

  assert.equal(summary.created, 0);
  assert.equal(summary.updated, 1);
  assert.equal(updates[0].where.id, "legacy-nmb-job");
  assert.equal(updates[0].data.source, "nmb-bank-careers");
});

test("concurrent scraper identity inserts are recovered as idempotent updates", async () => {
  let identityLookups = 0;
  const updates = [];
  const duplicate = new Error("Unique source identity");
  duplicate.code = "P2002";
  const prisma = {
    job: {
      findFirst: async ({ where }) => {
        if (where.slug) return null;
        identityLookups += 1;
        return identityLookups === 1 ? null : { id: "concurrent-job" };
      },
      create: async () => {
        throw duplicate;
      },
      update: async (payload) => updates.push(payload),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const job = {
    source: "nmb-bank-careers",
    sourceId: "nmb-credit-analyst",
    title: "Credit Analyst",
    company: "NMB Bank Plc",
    deadline: new Date("2099-07-31T23:59:59.000Z"),
    active: true,
  };

  const summary = await saveJobs(prisma, [job], "nmb-bank-careers");

  assert.equal(summary.created, 0);
  assert.equal(summary.updated, 1);
  assert.equal(updates[0].where.id, "concurrent-job");
});

test("slug normalization updates rows without creating duplicates", async () => {
  const rows = [
    {
      id: "1", title: "Accountant", company: "Alpha", source: "a",
      sourceId: "1", slug: "accountant-at-alpha-old",
    },
    {
      id: "2", title: "Accountant", company: "Beta", source: "b",
      sourceId: "2", slug: "accountant-at-beta-old",
    },
  ];
  const updates = [];
  const prisma = {
    job: {
      findMany: async () => rows,
      findFirst: async ({ where }) => {
        const pending = updates.find((update) => update.data.slug === where.slug);
        return pending ? { id: pending.where.id } : null;
      },
      update: async (payload) => updates.push(payload),
    },
  };
  const result = await normalizeJobSlugs(prisma);
  assert.deepEqual(result, { found: 2, updated: 2 });
  assert.equal(updates[0].data.slug, "accountant");
  assert.equal(updates[1].data.slug, "accountant-at-beta");
});
