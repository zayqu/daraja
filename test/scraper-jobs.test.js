const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanDescription,
  deduplicateJobs,
  getSourceId,
  normalizeJob,
  normalizeUrl,
  parseDeadline,
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

test("normalizeJob cleans data and keeps official application link", () => {
  const job = normalizeJob({
    title: "  ICT   Officer ",
    company: " Ministry  of Example ",
    deadline: "31/12/2099",
    numberOfPosts: "2 Posts",
    sourceUrl: "/vacancies/42",
  });

  assert.equal(job.title, "ICT Officer");
  assert.equal(job.company, "Ministry of Example");
  assert.equal(job.deadline.toISOString(), "2099-12-31T23:59:59.000Z");
  assert.equal(job.sourceUrl, "https://portal.ajira.go.tz/vacancies/42");
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
