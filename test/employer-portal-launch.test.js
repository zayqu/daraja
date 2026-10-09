const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const { parseApplicationDetails } = require("../lib/owner-vacancy");

const read = (file) => readFile(path.join(__dirname, "..", file), "utf8");

test("employer application details accept one email or https link with a closing day", () => {
  const errors = [];
  const email = parseApplicationDetails(
    { deadline: "2099-10-21", applyEmail: "careers@example.co.tz", emailSubject: "Application for Driver" },
    errors
  );
  assert.deepEqual(errors, []);
  assert.equal(email.applicationUrl, "mailto:careers@example.co.tz?subject=Application%20for%20Driver");
  assert.equal(email.deadline.toISOString(), "2099-10-21T20:59:59.000Z");

  const link = parseApplicationDetails({ applyUrl: "https://example.co.tz/jobs/1" }, errors);
  assert.equal(link.applicationUrl, "https://example.co.tz/jobs/1");

  const bad = [];
  parseApplicationDetails({ applyUrl: "http://example.co.tz", deadline: "21/10/2099" }, bad);
  assert.equal(bad.length, 2);
  const missing = [];
  parseApplicationDetails({}, missing);
  assert.match(missing.join(" "), /applyEmail or applyUrl is required/);
});

test("employer vacancy submissions require a closing date and an apply method", async () => {
  const route = await read("app/api/employer/jobs/route.js");
  assert.match(route, /parseApplicationDetails\(body, problems\)/);
  assert.match(route, /closing date is required/);
  assert.match(route, /closing date must be today or later/);
  assert.match(route, /deadline,\s*\n\s*applicationUrl,/);
  assert.match(route, /moderationStatus: "PENDING_REVIEW"/);

  const form = await read("components/EmployerVacancyForm.js");
  assert.match(form, /id="vacancy-deadline"/);
  assert.match(form, /id="vacancy-apply-email"/);
  assert.match(form, /id="vacancy-apply-url"/);
});

test("only verified employers' vacancies can be published", async () => {
  const route = await read("app/api/admin/jobs/[id]/moderate/route.js");
  assert.match(route, /status === "PUBLISHED"/);
  assert.match(route, /verificationStatus !== "VERIFIED"/);
  assert.match(route, /status: 409/);
});

test("admin page shows employer verification, review queue and live vacancies", async () => {
  const page = await read("app/admin/page.js");
  assert.match(page, /verificationStatus: "PENDING"/);
  assert.match(page, /<AdminEmployerQueue/);
  assert.match(page, /moderationStatus: "PUBLISHED", active: true/);
  assert.match(page, /<AdminJobReviewQueue jobs=\{liveJobs\.map\(serializeJob\)\} live \/>/);
  assert.match(page, /if \(!isAdmin\(actor\)\) notFound\(\)/);

  const queue = await read("components/AdminEmployerQueue.js");
  assert.match(queue, /\/api\/admin\/employers\/\$\{employer\.id\}/);
});

test("employer workspace lists only the signed-in employer's vacancies", async () => {
  const page = await read("app/employer/page.js");
  assert.match(page, /where: \{ employerId: actor\.employer\.id \}/);
});
