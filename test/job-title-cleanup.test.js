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

test("generic application and bank navigation labels are detected", () => {
  for (const value of [
    "Email Application",
    "Physical Application",
    "Online Application",
    "Application Method",
    "Apply Now",
    "View Details",
    "Home",
    "Swahili",
    "Vacancies and Tenders",
    "Working at GTBank",
    "Why Join GTBank?",
    "Careers Overview",
  ]) {
    assert.equal(isGenericJobTitle(value), true, value);
  }
  assert.equal(isGenericJobTitle("Human Resources Officer"), false);
  assert.equal(isGenericJobTitle("Specialist; Risk MI & Analytics"), false);
  assert.equal(isGenericJobTitle("Relationship Manager Corporate Bank"), false);
  assert.equal(
    isGenericJobTitle("LOLC Tanzania Microfinance Bank", {
      company: "LOLC Tanzania Microfinance Bank",
      source: "tanzania-financial-institutions",
    }),
    true,
  );
  assert.equal(
    isGenericJobTitle("LOLC Tanzania Microfinance Bank", {
      company: "Different employer",
      source: "ajiraweb",
    }),
    false,
  );
});

test("generic legacy records are archived reversibly", async () => {
  const updates = [];
  const prisma = {
    job: {
      findMany: async () => [
        { id: "bad-1", title: "Email Application", source: "ajira" },
        { id: "good-1", title: "Accountant", source: "ajira" },
        { id: "bad-2", title: "Vacancies and Tenders", source: "ajiraweb" },
        {
          id: "bad-3",
          title: "LOLC Tanzania Microfinance Bank",
          company: "LOLC Tanzania Microfinance Bank",
          source: "tanzania-financial-institutions",
        },
        {
          id: "good-2",
          title: "Relationship Manager Corporate Bank",
          company: "Example Bank",
          source: "tanzania-financial-institutions",
        },
      ],
      updateMany: async (args) => {
        updates.push(args);
        return { count: args.where.id.in.length };
      },
    },
  };

  const count = await archiveGenericJobTitles(prisma);
  assert.equal(count, 3);
  assert.deepEqual(updates[0].where.id.in, ["bad-1", "bad-2", "bad-3"]);
  assert.deepEqual(updates[0].data, { active: false });
});
