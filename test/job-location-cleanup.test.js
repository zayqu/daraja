const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanLocation,
  deadlineFromLocation,
  normalizeJob,
} = require("../scraper/lib/jobs");

test("location cleanup removes appended deadline labels", () => {
  assert.equal(
    cleanLocation("Dar es Salaam, TanzaniaDeadline: 31 August 2026"),
    "Dar es Salaam, Tanzania"
  );
  assert.equal(
    deadlineFromLocation("Dar es Salaam, TanzaniaDeadline: 31 August 2026"),
    "31 August 2026"
  );
});

test("normalization recovers an embedded deadline without polluting location", () => {
  const job = normalizeJob({
    title: "Inventory Officer",
    company: "Mawibho Beverages Company Limited",
    location: "Dar es Salaam, TanzaniaDeadline: 31 August 2026",
    sourceUrl: "https://example.com/jobs/inventory-officer",
  }, {
    source: "ajiraweb",
    baseUrl: "https://example.com/jobs",
  });

  assert.equal(job.location, "Dar es Salaam, Tanzania");
  assert.equal(job.deadline.toISOString(), "2026-08-31T23:59:59.000Z");
});
