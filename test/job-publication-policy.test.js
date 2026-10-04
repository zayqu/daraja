const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const {
  decidePublication,
  feeSignal,
  sourcePolicy,
} = require("../scraper/lib/job-policy");
const { saveJobs } = require("../scraper/lib/store");

test("fee requests are detected in English and Swahili", () => {
  for (const text of [
    "Successful candidates will pay a medical fee of Tsh 50,000",
    "Applicants must pay registration fee before interview",
    "Application fee: Tsh 10,000",
    "Tuma Tsh 20,000 kwa M-Pesa namba 0712",
    "Ada ya maombi ni shilingi 10,000",
    "Tuma pesa kiasi cha 20,000",
  ]) {
    assert.ok(feeSignal(text), text);
  }
});

test("fee disclaimers and job duties about fees are not blocked", () => {
  for (const text of [
    "We do not charge any application fee",
    "NOTE: No application fee is required at any stage",
    "Applicants are not required to pay application fee",
    "Hakuna ada ya maombi",
    "Salary: TZS 1,200,000 per month",
    "Ensure collection of loan processing fees",
    "Manage processing of customer payments via M-Pesa",
    "Process customer transfers of 1,000,000 daily",
  ]) {
    assert.equal(feeSignal(text), null, text);
  }
});

test("only approved sources publish automatically", () => {
  assert.equal(sourcePolicy("ajira").autoPublish, true);
  assert.equal(sourcePolicy("zoom-tanzania-jobs").autoPublish, false);
  assert.equal(sourcePolicy("unknown-blog").autoPublish, false);

  assert.equal(decidePublication({ title: "Accountant" }, "ajira").status, "PUBLISHED");
  assert.equal(
    decidePublication({ title: "Accountant" }, "zoom-tanzania-jobs").status,
    "PENDING_REVIEW"
  );
  assert.equal(
    decidePublication(
      { title: "Driver", applicationUrl: "https://wa.me/255700000000" },
      "ajira"
    ).status,
    "PENDING_REVIEW"
  );
  const blocked = decidePublication(
    { title: "Cashier", description: "Applicants must pay registration fee." },
    "ajira"
  );
  assert.equal(blocked.status, "REJECTED");
  assert.match(blocked.note, /asks candidates to pay/);
});

test("source precedence follows the job source policy order", () => {
  assert.ok(sourcePolicy("daraja").precedence < sourcePolicy("ajira").precedence);
  assert.ok(sourcePolicy("ajira").precedence < sourcePolicy("nmb-bank-careers").precedence);
  assert.ok(
    sourcePolicy("nmb-bank-careers").precedence < sourcePolicy("empower-tanzania").precedence
  );
  assert.ok(sourcePolicy("empower-tanzania").precedence < sourcePolicy("ajiraweb").precedence);
});

function fakePrisma({ existing = null, duplicates = [] } = {}) {
  const creates = [];
  const updates = [];
  return {
    creates,
    updates,
    job: {
      findFirst: async ({ where }) => (where.slug ? null : existing),
      findMany: async ({ where }) => (where.source?.not ? duplicates : []),
      create: async (payload) => creates.push(payload),
      update: async (payload) => updates.push(payload),
      updateMany: async () => ({ count: 0 }),
    },
  };
}

const vacancy = {
  source: "ajiraweb",
  sourceId: "credit-analyst-1",
  title: "Credit Analyst",
  company: "Akiba Commercial Bank",
  description: "Assess credit applications.",
  deadline: new Date("2099-07-31T23:59:59.000Z"),
  active: true,
};

test("new vacancies are stored with the publication decision", async () => {
  const prisma = fakePrisma();
  const summary = await saveJobs(
    prisma,
    [vacancy, { ...vacancy, sourceId: "fee-1", title: "Teller", description: "Application fee: Tsh 10,000" }],
    "ajiraweb"
  );
  assert.equal(prisma.creates[0].data.moderationStatus, "PUBLISHED");
  assert.equal(prisma.creates[1].data.moderationStatus, "REJECTED");
  assert.equal(summary.blocked, 1);
});

test("a less authoritative copy of a listed vacancy is not duplicated", async () => {
  const prisma = fakePrisma({
    duplicates: [{ id: "nmb-row", source: "nmb-bank-careers", moderationStatus: "PUBLISHED" }],
  });
  const summary = await saveJobs(prisma, [vacancy], "ajiraweb");
  assert.equal(prisma.creates.length, 0);
  assert.equal(prisma.updates.length, 0);
  assert.equal(summary.crossSourceDuplicates, 1);
});

test("a more authoritative source takes over an existing listing", async () => {
  const prisma = fakePrisma({
    duplicates: [{ id: "board-row", source: "ajiraweb", moderationStatus: "PUBLISHED" }],
  });
  const official = { ...vacancy, source: "nmb-bank-careers", sourceId: "nmb-credit-analyst" };
  const summary = await saveJobs(prisma, [official], "nmb-bank-careers");
  assert.equal(prisma.creates.length, 0);
  assert.equal(prisma.updates[0].where.id, "board-row");
  assert.equal(prisma.updates[0].data.source, "nmb-bank-careers");
  assert.equal(summary.crossSourceDuplicates, 1);
});

test("administrator decisions are never overwritten by a scraper refresh", async () => {
  const prisma = fakePrisma({
    existing: { id: "row", source: "ajiraweb", moderationStatus: "PUBLISHED", moderatedById: "admin" },
  });
  await saveJobs(
    prisma,
    [{ ...vacancy, description: "Applicants must pay registration fee." }],
    "ajiraweb"
  );
  assert.equal(Object.hasOwn(prisma.updates[0].data, "moderationStatus"), false);

  const auto = fakePrisma({
    existing: { id: "row", source: "ajiraweb", moderationStatus: "PUBLISHED", moderatedById: null },
  });
  await saveJobs(
    auto,
    [{ ...vacancy, description: "Applicants must pay registration fee." }],
    "ajiraweb"
  );
  assert.equal(auto.updates[0].data.moderationStatus, "REJECTED");
});

test("administrators see the vacancy review queue", async () => {
  const page = await readFile(path.join(__dirname, "..", "app", "admin", "page.js"), "utf8");
  const queue = await readFile(
    path.join(__dirname, "..", "components", "AdminJobReviewQueue.js"),
    "utf8"
  );
  assert.match(page, /moderationStatus: "PENDING_REVIEW"/);
  assert.match(page, /<AdminJobReviewQueue/);
  assert.match(queue, /\/api\/admin\/jobs\/\$\{job\.id\}\/moderate/);
  assert.match(queue, /!reason\.trim\(\)/);
});
