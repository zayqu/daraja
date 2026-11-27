const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("Post a job stores only stated salary, experience and openings", async () => {
  const { parseEmployerVacancy, vacancyFormValues } = await import("../lib/employer-vacancy.js");
  const now = new Date("2026-11-16T09:00:00.000Z");
  const base = {
    title: "Accountant",
    location: "Dar es Salaam",
    category: "Finance",
    type: "FULL_TIME",
    description: "Prepare reports.",
    deadline: "2026-11-30",
    applyEmail: "jobs@example.co.tz",
  };
  const shown = parseEmployerVacancy(
    { ...base, showSalary: true, salaryMin: "1,800,000", salaryMax: "2400000", experience: "3", openings: "2" },
    { categories: ["Finance"], now },
  );
  assert.deepEqual(shown.problems, []);
  assert.equal(shown.data.salary, "TSh 1,800,000 – 2,400,000 a month");
  assert.equal(shown.data.experienceMinYears, 3);
  assert.equal(shown.data.openings, 2);

  // Hidden salary is never stored; nothing is guessed.
  const hidden = parseEmployerVacancy({ ...base, showSalary: false, salaryMin: "900000" }, { categories: ["Finance"], now });
  assert.equal(hidden.data.salary, null);
  assert.equal(hidden.data.experienceMinYears, null);

  const reversed = parseEmployerVacancy(
    { ...base, showSalary: true, salaryMin: "2,000,000", salaryMax: "1,000,000" },
    { categories: ["Finance"], now },
  );
  assert.match(reversed.problems.join(" "), /must not be lower/);

  const values = vacancyFormValues({ salary: "TSh 1,800,000 – 2,400,000 a month", experienceMinYears: 3, openings: 2 });
  assert.equal(values.showSalary, true);
  assert.equal(values.salaryMin, "1800000");
  assert.equal(values.salaryMax, "2400000");
});

test("drafts need only a title and never go live", async () => {
  const { parseEmployerDraft } = await import("../lib/employer-vacancy.js");
  const now = new Date("2026-11-16T09:00:00.000Z");
  assert.deepEqual(parseEmployerDraft({ title: "Driver" }, { categories: ["Transport"], now }).problems, []);
  assert.match(parseEmployerDraft({}, { categories: ["Transport"], now }).problems[0], /title/);
  assert.match(
    parseEmployerDraft({ title: "Driver", category: "Astrology" }, { categories: ["Transport"], now }).problems.join(" "),
    /supported category/,
  );

  const create = read("app/api/employer/jobs/route.js");
  const update = read("app/api/employer/jobs/[id]/route.js");
  assert.match(create, /const draft = body\?\.draft === true;/);
  assert.match(update, /submit\s*\? parseEmployerVacancy/);
  // A trusted employer's own, never-reviewed draft publishes like a new post.
  assert.match(update, /existing\.moderationStatus === "DRAFT" && actor\.employer\?\.id === existing\.employerId && publishesWithoutReview\(actor\.employer\)/);
});

test("Post a job follows the Figma steps with preview and featured upsell", () => {
  const form = read("components/EmployerVacancyForm.js");
  for (const label of ["Basics", "Details", "How to apply", "Review"]) {
    assert.match(form, new RegExp(`label: "${label}"`));
  }
  assert.match(form, /Save draft/);
  assert.match(form, /Show on the job/);
  assert.match(form, /Jobs that show the salary usually get more applications\./);
  assert.match(form, /Feature this vacancy/);
  assert.match(form, /Add when I publish/);
  assert.match(form, /\/advertise\?vacancy=\$\{encodeURIComponent\(done\.title\)\}/);
  assert.match(read("app/advertise/page.js"), /bookingLink\(siteSetting\("promo\.whatsapp"\), price, vacancy\)/);
});
