const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateVacancy, originalEditorialSummary, prepareVerifiedVacancies,
} = require("../scraper/lib/verified-publication");

const now = new Date("2026-11-10T06:00:00Z");
const verified = {
  sourceId: "bank-42",
  title: "Senior Risk Analyst",
  company: "Example Bank",
  location: "Dar es Salaam",
  description: "The successful applicant will assess operational risks, review controls, and prepare reports. Applicants need relevant financial-services experience.",
  deadline: new Date("2026-11-30T23:59:59Z"),
  sourceUrl: "https://careers.example.co.tz/jobs/42",
  applicationUrl: "https://careers.example.co.tz/apply/42",
  originalEvidence: {
    verified: true,
    deadlineVerified: true,
    originalUrl: "https://careers.example.co.tz/jobs/42",
  },
};
test("only fully verified, unexpired vacancies qualify", () => {
  assert.deepEqual(validateVacancy(verified, now), { eligible: true, reasons: [] });
  for (const changed of [
    { deadline: null },
    { deadline: new Date("2026-11-09T23:59:59Z") },
    { company: "Employer in Tanzania" },
    { title: "Application Email" },
    { description: "Visit the employer website for details." },
    { originalEvidence: { verified: false, deadlineVerified: false, originalUrl: verified.sourceUrl } },
    { applicationUrl: "javascript:alert(1)", sourceUrl: "" },
  ]) {
    assert.equal(validateVacancy({ ...verified, ...changed }, now).eligible, false, JSON.stringify(changed));
  }
});
test("unverified aggregator email posts are held even with a deadline", () => {
  const proposed = {
    ...verified, sourceUrl: "https://jobboard.example/jobs/pilot",
    applicationUrl: "mailto:jobs@example.co.tz",
    originalEvidence: null,
  };
  const batch = prepareVerifiedVacancies([proposed], now);
  assert.equal(batch.held.length, 1);
  assert.match(batch.jobs[0].reviewReasons.join(" "), /original source/);
  assert.equal(batch.jobs[0].description, proposed.description);
});
test("editorial text is distinct, factual, and consistently structured", () => {
  const result = originalEditorialSummary({ ...verified, openings: 2, type: "FULL_TIME" });
  assert.match(result, /Example Bank has advertised a vacancy for Senior Risk Analyst in Dar es Salaam/);
  assert.match(result, /30 November 2026/);
  assert.match(result, /2 openings/);
  assert.match(result, /Job description/);
  assert.match(result, /Source excerpt: “The successful applicant will assess operational risks/);
  assert.ok(result.length > verified.description.length);
  assert.doesNotMatch(result, /salary|degree required/i);
});
test("eligible jobs get an editorial description and retain application provenance", () => {
  const batch = prepareVerifiedVacancies([verified], now);
  assert.equal(batch.held.length, 0);
  assert.notEqual(batch.jobs[0].description, verified.description);
  assert.equal(batch.jobs[0].sourceUrl, verified.sourceUrl);
  assert.equal(batch.jobs[0].applicationUrl, verified.applicationUrl);
});
