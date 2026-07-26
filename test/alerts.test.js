const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAlertEmail,
  escapeHtml,
  jobMatchesInterests,
  sendJobAlertDigests,
} = require("../scraper/lib/alerts");

test("job alert email escapes source text and contains an unsubscribe link", () => {
  const email = buildAlertEmail(
    { unsubscribeToken: "11111111-1111-4111-8111-111111111111" },
    [{
      id: "job-1",
      title: "Finance <Manager>",
      company: "Example & Co",
      location: "Dar es Salaam",
    }]
  );

  assert.equal(email.subject, "1 new matching job on Daraja");
  assert.match(email.html, /Finance &lt;Manager&gt;/);
  assert.match(email.html, /Example &amp; Co/);
  assert.match(email.html, /unsubscribe=11111111-1111-4111-8111-111111111111/);
  assert.equal(escapeHtml(`"'<>`), "&quot;&#039;&lt;&gt;");
});

test("job alerts match only the subscriber's selected fields", () => {
  const graphicJob = {
    title: "Senior Graphic Designer",
    category: "Sales & Marketing",
    company: "Example Agency",
    description: "Create brand identities and campaign artwork.",
  };
  const financeJob = {
    title: "Credit Analyst",
    category: "Banking & Finance",
    company: "Example Bank",
    description: "Assess lending applications.",
  };

  assert.equal(jobMatchesInterests(graphicJob, ["Graphic Designer"]), true);
  assert.equal(jobMatchesInterests(graphicJob, ["Brand Identity"]), false);
  assert.equal(jobMatchesInterests(financeJob, ["Graphic Designer"]), false);
  assert.equal(jobMatchesInterests(financeJob, ["Banking & Finance"]), true);
});

test("job alert delivery safely skips when sender credentials are absent", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.JOB_ALERTS_FROM_EMAIL;
  delete process.env.RESEND_API_KEY;
  delete process.env.JOB_ALERTS_FROM_EMAIL;

  try {
    assert.deepEqual(await sendJobAlertDigests({}), { sent: 0, skipped: true });
  } finally {
    if (previousKey) process.env.RESEND_API_KEY = previousKey;
    if (previousFrom) process.env.JOB_ALERTS_FROM_EMAIL = previousFrom;
  }
});
