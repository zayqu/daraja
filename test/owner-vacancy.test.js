const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { parseOwnerVacancy } = require("../lib/owner-vacancy");
const { publishOwnerVacancies, readVacancies } = require("../scripts/publish-owner-vacancies");

const NOW = new Date("2026-10-08T10:00:00Z");
const BASE = {
  title: "Radio Presenter",
  company: "New radio station",
  location: "Dar es Salaam",
  category: "Creative, Design & Media",
  deadline: "2026-10-21",
  applyEmail: "jobs@example.com",
  emailSubject: "Presenter - [Your Name]",
  description: ["Key responsibilities", "- Present engaging programmes for young and older audiences every day."],
};

test("owner vacancies publish with a mailto subject and an end-of-day EAT deadline", () => {
  const { job, errors } = parseOwnerVacancy(BASE, "radio-presenter.json", { now: NOW });
  assert.equal(errors, undefined);
  assert.equal(job.sourceId, "owner-radio-presenter");
  assert.equal(job.moderationStatus, "PUBLISHED");
  assert.equal(job.active, true);
  assert.equal(job.deadline.toISOString(), "2026-10-21T20:59:59.000Z");
  assert.equal(job.applicationUrl, "mailto:jobs@example.com?subject=Presenter%20-%20%5BYour%20Name%5D");
  assert.equal(job.type, null);
});

test("invalid owner vacancies list every problem and publish nothing", () => {
  const { errors } = parseOwnerVacancy(
    { ...BASE, category: "Radio", applyEmail: "", description: "short", type: "SOMETIMES" },
    "Bad Name.json"
  );
  assert.ok(errors.length >= 5);
});

test("an expired deadline keeps the vacancy closed", () => {
  const { job } = parseOwnerVacancy({ ...BASE, deadline: "2026-10-01" }, "old-role.json", { now: NOW });
  assert.equal(job.active, false);
});

test("every committed vacancy file is valid", () => {
  const vacancies = readVacancies(path.join(__dirname, "..", "content", "vacancies"));
  assert.ok(vacancies.length >= 1);
  for (const vacancy of vacancies) assert.equal(vacancy.errors, undefined, `${vacancy.file}: ${vacancy.errors}`);
});

test("publishing creates once and updates on rerun", async () => {
  const jobs = new Map();
  const audits = [];
  const prisma = {
    job: {
      findUnique: async ({ where }) => {
        if (where.id) return [...jobs.values()].find((job) => job.id === where.id) || null;
        return jobs.get(where.source_sourceId.sourceId) || null;
      },
      create: async ({ data }) => {
        const record = { ...data, id: `id-${jobs.size + 1}` };
        jobs.set(data.sourceId, record);
        return { id: record.id };
      },
      update: async ({ where, data }) => {
        const record = [...jobs.values()].find((job) => job.id === where.id);
        Object.assign(record, data);
        return { id: record.id, slug: record.slug };
      },
      findFirst: async () => null,
    },
    auditEvent: { create: async ({ data }) => audits.push(data) },
  };
  const vacancy = { file: "radio-presenter.json", ...parseOwnerVacancy(BASE, "radio-presenter.json", { now: NOW }) };
  const first = await publishOwnerVacancies(prisma, [vacancy]);
  const second = await publishOwnerVacancies(prisma, [vacancy]);
  assert.equal(jobs.size, 1);
  assert.equal(first[0].created, true);
  assert.equal(second[0].created, false);
  assert.equal(second[0].slug, first[0].slug);
  assert.deepEqual(audits.map((audit) => audit.action), ["OWNER_VACANCY_PUBLISHED", "OWNER_VACANCY_UPDATED"]);
});
