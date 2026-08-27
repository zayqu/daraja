const test = require("node:test");
const assert = require("node:assert/strict");

const { archiveMissingSourceJobs } = require("../scraper/lib/store");

test("authoritative source snapshots archive vacancies that disappeared", async () => {
  const updates = [];
  const prisma = {
    job: {
      updateMany: async (args) => {
        updates.push(args);
        return { count: 2 };
      },
    },
  };

  const count = await archiveMissingSourceJobs(
    prisma,
    [{ sourceId: "100" }, { sourceId: "101" }],
    "ajira"
  );

  assert.equal(count, 2);
  assert.deepEqual(updates[0], {
    where: {
      source: "ajira",
      active: true,
      sourceId: { notIn: ["100", "101"] },
    },
    data: { active: false },
  });
});

test("empty snapshots do not mass-archive existing vacancies", async () => {
  let called = false;
  const prisma = {
    job: {
      updateMany: async () => {
        called = true;
        return { count: 99 };
      },
    },
  };

  assert.equal(await archiveMissingSourceJobs(prisma, [], "nmb-bank-careers"), 0);
  assert.equal(called, false);
});

test("non-snapshot sources are left untouched", async () => {
  let called = false;
  const prisma = {
    job: {
      updateMany: async () => {
        called = true;
        return { count: 1 };
      },
    },
  };

  assert.equal(
    await archiveMissingSourceJobs(prisma, [{ sourceId: "x" }], "manual-source"),
    0
  );
  assert.equal(called, false);
});
