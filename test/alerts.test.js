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
  assert.match(
    email.html,
    /alerts\/unsubscribe\?token=11111111-1111-4111-8111-111111111111/
  );
  assert.equal(
    email.headers["List-Unsubscribe"],
    "<https://www.ajira.daraja.co.tz/api/job-alerts?unsubscribe=11111111-1111-4111-8111-111111111111>"
  );
  assert.equal(
    email.headers["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click"
  );
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

test("job alert delivery forwards native one-click unsubscribe headers", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.JOB_ALERTS_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-key";
  process.env.JOB_ALERTS_FROM_EMAIL = "Daraja Jobs <test@example.com>";

  let requestBody;
  const createdAt = new Date("2026-07-28T08:00:00.000Z");
  const prisma = {
    jobAlertSubscriber: {
      findMany: async () => [{
        id: "subscriber-1",
        email: "candidate@example.com",
        interests: ["Technology"],
        unsubscribeToken: "11111111-1111-4111-8111-111111111111",
        lastNotifiedAt: new Date("2026-07-27T08:00:00.000Z"),
      }],
      update: async () => ({}),
    },
    job: {
      findMany: async () => [{
        id: "job-1",
        title: "Software Engineer",
        company: "Example Ltd",
        location: "Dar es Salaam",
        category: "Technology",
        description: "Build reliable services.",
        createdAt,
      }],
    },
  };
  const fetchFn = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true };
  };

  try {
    assert.deepEqual(
      await sendJobAlertDigests(prisma, fetchFn),
      { sent: 1, skipped: false }
    );
    assert.equal(
      requestBody.headers["List-Unsubscribe-Post"],
      "List-Unsubscribe=One-Click"
    );
    assert.match(requestBody.headers["List-Unsubscribe"], /^<https:\/\/.+>$/);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.JOB_ALERTS_FROM_EMAIL;
    else process.env.JOB_ALERTS_FROM_EMAIL = previousFrom;
  }
});
