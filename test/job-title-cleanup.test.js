const test = require("node:test");
const assert = require("node:assert/strict");

const {
  encryptAjiraId,
  getAjiraDetailUrl,
  sourceIdFor,
} = require("../scraper/sources/ajira");
const {
  isGenericJobTitle,
  archiveGenericJobTitles,
} = require("../scraper/lib/store");

test("rendered Ajira URLs preserve the original numeric vacancy identity", () => {
  const encrypted = encryptAjiraId(13755);
  assert.equal(sourceIdFor(getAjiraDetailUrl(13755), "Ignored", "Ignored"), "13755");
  assert.ok(encrypted.length > 10);
});

test("generic application labels are detected without rejecting real roles", () => {
  for (const value of [
    "Email Application",
    "Physical Application",
    "Online Application",
    "Application Method",
    "Apply Now",
    "View Details",
  ]) {
    assert.equal(isGenericJobTitle(value), true);
  }
  assert.equal(isGenericJobTitle("Human Resources Officer"), false);
});

test("generic legacy records are archived reversibly", async () => {
  const updates = [];
  const prisma = {
    job: {
      findMany: async () => [
        { id: "bad-1", title: "Email Application" },
        { id: "good-1", title: "Accountant" },
        { id: "bad-2", title: "Physical Application" },
      ],
      updateMany: async (args) => {
        updates.push(args);
        return { count: args.where.id.in.length };
      },
    },
  };

  const count = await archiveGenericJobTitles(prisma);
  assert.equal(count, 2);
  assert.deepEqual(updates[0].where.id.in, ["bad-1", "bad-2"]);
  assert.deepEqual(updates[0].data, { active: false });
});
