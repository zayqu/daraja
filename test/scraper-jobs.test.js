const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanDescription,
  deduplicateJobs,
  extractExperience,
  getSourceId,
  mapEmploymentType,
  normalizeJob,
  normalizeUrl,
  parseDeadline,
  parseOpenings,
} = require("../scraper/lib/jobs");

test("cleanDescription removes fields already displayed by the job page", () => {
  assert.equal(
    cleanDescription(`
      Assess credit applications and financial risks.

      Organization: Example Bank
      Location: Dar es Salaam, Tanzania
      Application Method: Email
      Application Email: recruitment@example.co.tz
      Application Deadline: 31 July 2099

      Prepare clear recommendations for the credit committee.
    `),
    [
      "Assess credit applications and financial risks.",
      "Prepare clear recommendations for the credit committee.",
    ].join("\n\n")
  );
});

test("parseDeadline parses Ajira day/month/year dates at end of day UTC", () => {
  assert.equal(parseDeadline("25/07/2026").toISOString(), "2026-07-25T23:59:59.000Z");
  assert.equal(parseDeadline("31 July 2026").toISOString(), "2026-07-31T23:59:59.000Z");
  assert.equal(parseDeadline("31-02-2026"), null);
  assert.equal(parseDeadline("not a date"), null);
});

test("normalizeUrl accepts official relative links and rejects unsafe protocols", () => {
  assert.equal(
    normalizeUrl("/vacancies/ABC-123"),
    "https://portal.ajira.go.tz/vacancies/ABC-123"
  );
  assert.equal(
    normalizeUrl("javascript:alert(1)"),
    "https://portal.ajira.go.tz/vacancies"
  );
  assert.equal(
    normalizeUrl("mailto:jobs@example.co.tz?subject=Application"),
    "mailto:jobs@example.co.tz?subject=Application"
  );
  const emailUrl = normalizeUrl(
    "mailto:jobs@example.co.tz?subject=Application%20for%20Credit%20Analyst&body=Dear%20Hiring%20Team%2C%0A%0APlease%20find%20my%20CV%20attached."
  );
  assert.doesNotMatch(emailUrl, /\+/);
  assert.equal(
    new URL(emailUrl).searchParams.get("subject"),
    "Application for Credit Analyst"
  );
  assert.match(new URL(emailUrl).searchParams.get("body"), /Dear Hiring Team/);
});

test("getSourceId prefers the vacancy identifier in a detail URL", () => {
  assert.equal(
    getSourceId({
      title: "Accountant",
      company: "Example Authority",
      sourceUrl: "https://portal.ajira.go.tz/vacancies/ABC-123",
    }),
    "abc-123"
  );
});

test("normalizeJob keeps source, application and media fields separate", () => {
  const job = normalizeJob({
    title: "  ICT   Officer ",
    company: " Ministry  of Example ",
    deadline: "31/12/2099",
    numberOfPosts: "2 Posts",
    sourceUrl: "/vacancies/42",
    applicationUrl: "/auth/login",
    companyLogo: "/assets/logo.png",
    representativeImage: "/assets/team.jpg",
  });

  assert.equal(job.title, "ICT Officer");
  assert.equal(job.company, "Ministry of Example");
  assert.equal(job.deadline.toISOString(), "2099-12-31T23:59:59.000Z");
  assert.equal(job.sourceUrl, "https://portal.ajira.go.tz/vacancies/42");
  assert.equal(job.applicationUrl, "https://portal.ajira.go.tz/auth/login");
  assert.equal(job.companyLogo, "https://portal.ajira.go.tz/assets/logo.png");
  assert.equal(job.representativeImage, "https://portal.ajira.go.tz/assets/team.jpg");
  assert.equal(job.active, true);
  assert.match(job.description, /2 Posts/);
});

test("deduplicateJobs returns one normalized record per source identity", () => {
  const jobs = deduplicateJobs([
    {
      title: "Driver",
      company: "Agency",
      deadline: "31/12/2099",
      sourceUrl: "/vacancies/7",
    },
    {
      title: " Driver ",
      company: "Agency",
      deadline: "31/12/2099",
      sourceUrl: "/vacancies/7",
    },
    { title: "", company: "Agency" },
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "7");
});

test("extractExperience keeps only experience the vacancy states", () => {
  assert.deepEqual(extractExperience("3-5 years of experience in UX"), { min: 3, max: 5 });
  assert.deepEqual(extractExperience("Experience: 2 to 4 years"), { min: 2, max: 4 });
  assert.deepEqual(
    extractExperience("Minimum of three (3) years of relevant working experience"),
    { min: 3, max: null }
  );
  assert.deepEqual(extractExperience("At least 5+ years experience in banking"), { min: 5, max: null });
  assert.deepEqual(extractExperience("3 years of experience in audit"), { min: 3, max: 3 });
  assert.deepEqual(
    extractExperience("Awe na uzoefu wa kazi usiopungua miaka mitatu"),
    { min: 3, max: null }
  );
  assert.deepEqual(extractExperience("No experience required"), { min: 0, max: 0 });
  assert.equal(extractExperience("Three-year contract renewable"), null);
  assert.equal(extractExperience("Bachelor degree in Accounting"), null);
});

test("parseDeadline reads Swahili and long-form English dates", () => {
  assert.equal(parseDeadline("30 Oktoba 2026").toISOString(), "2026-10-30T23:59:59.000Z");
  assert.equal(parseDeadline("Tarehe 5 Novemba 2026").toISOString(), "2026-11-05T23:59:59.000Z");
  assert.equal(parseDeadline("30th October, 2026").toISOString(), "2026-10-30T23:59:59.000Z");
  assert.equal(parseDeadline("October 30, 2026").toISOString(), "2026-10-30T23:59:59.000Z");
  assert.equal(parseDeadline("31 Februari 2026"), null);
});

test("employment type and openings are never defaulted", () => {
  assert.equal(mapEmploymentType("Contract"), "CONTRACT");
  assert.equal(mapEmploymentType("FULL_TIME"), "FULL_TIME");
  assert.equal(mapEmploymentType("", "Graduate Intern"), "INTERNSHIP");
  assert.equal(mapEmploymentType("", "Accountant", "Ajira ya mkataba wa miaka miwili"), "CONTRACT");
  assert.equal(mapEmploymentType("", "Accountant", "Manage contract documentation"), null);
  assert.equal(parseOpenings("2 Posts"), 2);
  assert.equal(parseOpenings("Nafasi 5"), 5);
  assert.equal(parseOpenings(""), null);

  const job = normalizeJob(
    { title: "Accountant", description: "Prepare monthly reports." },
    { company: "Example Ltd" }
  );
  assert.equal(job.type, null);
  assert.equal(job.experienceMinYears, null);
  assert.equal(job.openings, null);
});

test("normalizeJob drops vacancies with no stated employer", () => {
  assert.equal(normalizeJob({ title: "Driver", description: "Drive." }), null);
  const job = normalizeJob({
    title: "Senior Accountant",
    company: "Example Bank",
    numberOfPosts: "3 Posts",
    description: "Requires 4-6 years of experience. Full-time role.",
  });
  assert.equal(job.openings, 3);
  assert.equal(job.experienceMinYears, 4);
  assert.equal(job.experienceMaxYears, 6);
  assert.equal(job.type, "FULL_TIME");
});
