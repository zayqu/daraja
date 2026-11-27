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
  const edit = await read("app/api/employer/jobs/[id]/route.js");
  // Creating and editing a vacancy share one set of rules.
  for (const source of [route, edit]) {
    assert.match(source, /parseEmployerVacancy\(body, \{ categories: await getCategoryNames\(\) \}\)/);
  }
  assert.match(route, /moderationStatus: "PENDING_REVIEW"/);

  const rules = await read("lib/employer-vacancy.js");
  assert.match(rules, /parseApplicationDetails\(body, problems\)/);

  const form = await read("components/EmployerVacancyForm.js");
  assert.match(form, /id="vacancy-deadline"/);
  assert.match(form, /id="vacancy-apply-email"/);
  assert.match(form, /id="vacancy-apply-url"/);
});

test("employer vacancy rules check the closing date, category and apply method", async () => {
  const { parseEmployerVacancy } = await import("../lib/employer-vacancy.js");
  const now = new Date("2026-11-16T09:00:00.000Z");
  const categories = ["Engineering"];
  const valid = {
    title: " Site Engineer ",
    location: "Dodoma",
    category: "Engineering",
    type: "CONTRACT",
    description: "Build things.",
    deadline: "2026-11-16",
    applyEmail: "jobs@example.co.tz",
    emailSubject: "Application for Site Engineer",
  };

  const ok = parseEmployerVacancy(valid, { categories, now });
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.data.title, "Site Engineer");
  assert.equal(ok.data.applicationUrl, "mailto:jobs@example.co.tz?subject=Application%20for%20Site%20Engineer");
  // A vacancy closing today is still accepted: the day ends at 23:59:59 EAT.
  assert.equal(ok.data.deadline.toISOString(), "2026-11-16T20:59:59.000Z");

  const past = parseEmployerVacancy({ ...valid, deadline: "2026-10-31" }, { categories, now });
  assert.deepEqual(past.problems, ["closing date must be today or later"]);
  const missing = parseEmployerVacancy({ ...valid, deadline: "" }, { categories, now });
  assert.deepEqual(missing.problems, ["closing date is required"]);
  const unknown = parseEmployerVacancy({ ...valid, category: "Astrology" }, { categories, now });
  assert.deepEqual(unknown.problems, ["choose a supported category and job type"]);
  const noApply = parseEmployerVacancy({ ...valid, applyEmail: "" }, { categories, now });
  assert.match(noApply.problems.join(" "), /applyEmail or applyUrl is required/);
});

test("employers see a past closing date as Closed and can reopen the form with saved values", async () => {
  const { vacancyFormValues, vacancyState } = await import("../lib/employer-vacancy.js");
  const now = new Date("2026-11-16T09:00:00.000Z");
  const job = {
    moderationStatus: "PUBLISHED",
    active: true,
    deadline: new Date("2026-10-31T20:59:59.000Z"),
  };
  assert.equal(vacancyState(job, now).label, "Closed");
  assert.equal(vacancyState({ ...job, deadline: new Date("2026-11-30T20:59:59.000Z") }, now).label, "Live");
  assert.equal(vacancyState({ ...job, moderationStatus: "REJECTED" }, now).label, "Not approved");
  assert.equal(vacancyState({ ...job, moderationStatus: "PENDING_REVIEW" }, now).label, "In review");
  assert.equal(vacancyState({ ...job, moderationStatus: "ARCHIVED", active: false }, now).label, "Closed");

  const values = vacancyFormValues({
    ...job,
    title: "Driver",
    applicationUrl: "mailto:jobs@example.co.tz?subject=Application%20for%20Driver",
  });
  assert.equal(values.deadline, "2026-10-31");
  assert.equal(values.applyMethod, "email");
  assert.equal(values.applyEmail, "jobs@example.co.tz");
  const link = vacancyFormValues({ ...job, applicationUrl: "https://example.co.tz/apply" });
  assert.equal(link.applyMethod, "link");
  assert.equal(link.applyUrl, "https://example.co.tz/apply");
});

test("only verified employers' vacancies can be published", async () => {
  const route = await read("app/api/admin/jobs/[id]/moderate/route.js");
  assert.match(route, /status === "PUBLISHED"/);
  assert.match(route, /verificationStatus !== "VERIFIED"/);
  assert.match(route, /status: 409/);
});

test("admin panel shows employer verification, review queue and all jobs", async () => {
  const overview = await read("app/admin/page.js");
  assert.match(overview, /moderationStatus: "PENDING_REVIEW"/);
  assert.match(overview, /<AdminJobReviewQueue/);
  const employers = await read("app/admin/employers/page.js");
  assert.match(employers, /verificationStatus/);
  assert.match(employers, /employerActions\(employer\)/);
  const actions = await read("lib/admin-actions.js");
  assert.match(actions, /\/api\/admin\/employers\/\$\{employer\.id\}/);
  const jobs = await read("app/admin/jobs/page.js");
  assert.match(jobs, /moderationStatus: "PUBLISHED", active: true/);
  assert.match(await read("lib/admin-guard.js"), /if \(!isAdmin\(actor\)\) notFound\(\)/);
});

test("employer workspace lists only the signed-in employer's vacancies", async () => {
  const page = await read("app/employer/page.js");
  assert.match(page, /where: \{ employerId: actor\.employer\.id \}/);
});
