const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAlertEmail,
  deliveryKey,
  escapeHtml,
  jobMatchesInterests,
  jobMatchesPreferences,
  sendJobAlertDigests,
} = require("../scraper/lib/alerts");

test("job alert email escapes source text and contains an unsubscribe link", () => {
  const email = buildAlertEmail(
    { unsubscribeToken: "11111111-1111-4111-8111-111111111111" },
    [{
      id: "job-1",
      slug: "finance-manager-at-example-co-123456789abc",
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

  assert.equal(jobMatchesInterests(graphicJob, ["Sales & Marketing"]), true);
  assert.equal(jobMatchesInterests(graphicJob, ["Banking & Finance"]), false);
  assert.equal(jobMatchesInterests(financeJob, ["Sales & Marketing"]), false);
  assert.equal(jobMatchesInterests(financeJob, ["Banking & Finance"]), true);
  assert.equal(jobMatchesPreferences(graphicJob, {
    categories: ["Sales & Marketing"],
    keywords: ["Graphic Designer"],
    locations: [],
    organisations: [],
    experienceLevels: [],
    workArrangements: [],
  }), true);
  assert.equal(jobMatchesPreferences(graphicJob, {
    categories: ["Sales & Marketing"],
    keywords: ["Credit Analyst"],
    locations: [],
    organisations: [],
    experienceLevels: [],
    workArrangements: [],
  }), false);
  assert.equal(deliveryKey("subscriber-1", [{ id: "b" }, { id: "a" }]),
    deliveryKey("subscriber-1", [{ id: "a" }, { id: "b" }]));
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
        userId: "user-1",
        email: "candidate@example.com",
        categories: ["Technology"],
        locations: [],
        organisations: [],
        keywords: [],
        experienceLevels: [],
        workArrangements: [],
        unsubscribeToken: "11111111-1111-4111-8111-111111111111",
        lastNotifiedAt: new Date("2026-07-27T08:00:00.000Z"),
      }],
      update: async () => ({}),
    },
    jobAlertDelivery: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: "delivery-1", attemptCount: 0, ...data }),
      update: async () => ({}),
    },
    job: {
      findMany: async () => [{
        id: "job-1",
        slug: "software-engineer-at-example-ltd-123456789abc",
        title: "Software Engineer",
        company: "Example Ltd",
        location: "Dar es Salaam",
        category: "Technology",
        description: "Build reliable services.",
        createdAt,
      }],
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const fetchFn = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: "resend-test-message" }) };
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
    assert.match(requestBody.html, /software-engineer-at-example-ltd/);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.JOB_ALERTS_FROM_EMAIL;
    else process.env.JOB_ALERTS_FROM_EMAIL = previousFrom;
  }
});
