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
  assert.match(result, /Job position\nSenior Risk Analyst/);
  assert.match(result, /Hiring organization\nExample Bank/);
  assert.match(result, /Job overview\nExample Bank is inviting applications for Senior Risk Analyst in Dar es Salaam/);
  assert.match(result, /30 November 2026/);
  assert.match(result, /Number of positions\n2/);
  assert.match(result, /Job description/);
  assert.match(result, /From the official notice: The successful applicant will assess operational risks/);
  assert.match(result, /Application deadline\n30 November 2026/);
  assert.doesNotMatch(result, /How to apply|Original vacancy|careers.example.co.tz/);
  assert.ok(result.length > verified.description.length);
  assert.doesNotMatch(result, /salary|degree required/i);
});
test("eligible jobs get an editorial description and retain application provenance", () => {
  const batch = prepareVerifiedVacancies([verified], now);
  assert.equal(batch.held.length, 1);
  assert.match(batch.jobs[0].reviewReasons.join(" "), /editorial draft requires human/);
  assert.notEqual(batch.jobs[0].description, verified.description);
  assert.equal(batch.jobs[0].sourceUrl, verified.sourceUrl);
  assert.equal(batch.jobs[0].applicationUrl, verified.applicationUrl);
});


test("ISO date-only closing dates remain open through the advertised date", () => {
  const { parseDeadline } = require("../scraper/lib/jobs");
  assert.equal(parseDeadline("2026-11-30").toISOString(), "2026-11-30T23:59:59.000Z");
  assert.equal(validateVacancy({ ...verified, deadline: "2026-11-30" }, now).eligible, true);
  assert.equal(parseDeadline("2026-02-30"), null);
});

test("the same editorial headings carry different role-specific facts", () => {
  const bank = {
    ...verified,
    description: "Job Purpose\nAssess credit requests and prepare risk recommendations for the bank.\nPrincipal Responsibilities\nReview loan portfolios for policy compliance and document key findings.\nQualifications Required\nA bachelor's degree in finance or accounting is required.\nHow to Apply\nSubmit an application through the official employer portal.",
  };
  const hospital = {
    ...verified, title: "Registered Nurse", company: "Example Hospital",
    description: "Job Purpose\nProvide direct nursing care and maintain accurate patient records.\nPrincipal Responsibilities\nMonitor vital signs and coordinate with medical staff.\nQualifications Required\nCurrent nursing registration is required to practise.\nHow to Apply\nUpload the requested documents to the official hospital careers site.",
  };
  const b = originalEditorialSummary(bank);
  const h = originalEditorialSummary(hospital);
  for (const heading of ["Job position", "Hiring organization", "Job overview", "Job description", "Responsibilities", "Qualifications", "Application deadline", "Application requirements"]) {
    assert.ok(b.includes(heading), heading);
    assert.ok(h.includes(heading), heading);
  }
  assert.match(b, /loan portfolios/);
  assert.match(h, /patient records/);
  assert.doesNotMatch(h, /loan portfolios/);
  assert.doesNotMatch(b, /patient records/);
  assert.match(h, /nursing registration/);
});
test("the formatter does not invent salary, experience or documents", () => {
  const result = originalEditorialSummary(verified);
  assert.doesNotMatch(result, /TZS|salary:|years of experience|certificate|CV required/i);
  assert.doesNotMatch(result, /How to apply|Application requirements|Apply through/);
});

test("a near-copied source summary is flagged for originality review", () => {
  const { sourceOverlap } = require("../scraper/lib/verified-publication");
  const copied = "The applicant will develop quarterly reporting dashboards and prepare data analysis for the department.";
  assert.ok(sourceOverlap(copied, copied) > 0.9);
  assert.equal(sourceOverlap(copied, "The post concerns reporting analysis work."), 0);
  const example = {
    ...verified,
    description: [
      "Job Purpose",
      "The role is responsible for monitoring credit risk reports and maintaining compliance with financial policies across banking operations.",
      "Principal Responsibilities",
      "Review internal risk processes and assess compliance indicators in monthly reports submitted by various business departments.",
      "Prepare accurate reporting dashboards for senior management and evaluate potential financial risks affecting clients and business operations.",
      "Qualifications Required",
      "Applicants should possess a recognised qualification in accounting, banking, finance, or another closely related professional discipline.",
      "Experience",
      "The applicant must demonstrate professional experience interpreting financial data and communicating analytical findings to relevant stakeholders.",
    ].join("\n"),
  };
  const batch = prepareVerifiedVacancies([example], now);
  assert.equal(batch.held.length, 1);
  assert.match(batch.jobs[0].reviewReasons.join(" "), /originality review/);
});


test("application instructions appear only when the employer provides them", () => {
  const instructions = {
    ...verified,
    description: "Job Purpose\nLead operational risk reporting and assess bank control procedures.\nHow to Apply\nUpload copies of the requested professional registration documents.",
  };
  const result = originalEditorialSummary(instructions);
  assert.match(result, /Application requirements/);
  assert.match(result, /professional registration documents/);
  assert.doesNotMatch(result, /Apply through the original employer destination/);
});


test("lexically different formatting never bypasses editorial approval", () => {
  const job = {
    ...verified,
    description: [
      "Job Purpose",
      "Oversee reporting operations for a specialist risk management team.",
      "Responsibilities",
      "Prepare monthly summaries and analyse control effectiveness.",
    ].join("\n"),
  };
  const result = prepareVerifiedVacancies([job], now);
  assert.equal(result.held.length, 1);
  assert.match(result.jobs[0].reviewReasons.join(" "), /editorial draft requires human|originality review/);
});
