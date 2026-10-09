const test = require("node:test");
const assert = require("node:assert/strict");
const {
  API_ROOT, CRDB_APPLY_URL, CRDB_CAREERS_URL, collectCrdbJobs,
} = require("../scraper/sources/crdb");

const summaries = [
  { id: 2434, title: "BUSINESS INTELLIGENCE DIGITAL CHANNEL SPECIALIST", location: "Tanzania Head Office", businessUnit: "RETAIL BANKING", deadline: "2099-10-14", jobAlert: "INTERNAL_AND_EXTERNAL", status: "OPEN", numberOfCandidates: 1 },
  { id: 2446, title: "HEAD OF BUSINESS DEVELOPMENT", location: "Subsidiary", businessUnit: "CRDB INSURANCE", deadline: "2099-10-22", jobAlert: "INTERNAL_AND_EXTERNAL", status: "OPEN", numberOfCandidates: 2 },
  { id: 2424, title: "LEGAL OFFICER", location: "DRC Branch", businessUnit: "DRC SUBSIDIARY", deadline: "2099-10-09", jobAlert: "EXTERNAL", status: "OPEN" },
  { id: 2429, title: "SENIOR SPECIALIST DIGITAL PRODUCTS", location: "Tanzania Head Office", businessUnit: "RETAIL BANKING", deadline: "2099-10-13", jobAlert: "INTERNAL", status: "OPEN" },
];
const details = {
  2434: {
    id: 2434, title: "BUSINESS INTELLIGENCE DIGITAL CHANNEL SPECIALIST",
    jobPurpose: "<p>Drive commercial insights across digital banking.</p>",
    principalResponsibilities: "<ul><li>Monitor key product metrics.</li></ul>",
    qualificationRequired: "<p>Minimum of 3 years of experience in data analysis.</p>",
    deadline: "2099-10-14", status: "OPEN", numberOfCandidates: 1,
    jobAlert: "INTERNAL_AND_EXTERNAL", employmentTerms: "PERMANENT",
    footer: "<p>CRDB Bank does not charge application fees.</p>",
    jobDetail: { companyCode: "00001", businessLocation: "Tanzania Head Office", costCenterName: "RETAIL BANKING" },
  },
  2446: {
    id: 2446, title: "HEAD OF BUSINESS DEVELOPMENT", jobPurpose: "<p>Lead insurance growth.</p>",
    deadline: "2099-10-22", status: "OPEN", numberOfCandidates: 2,
    jobAlert: "INTERNAL_AND_EXTERNAL", employmentTerms: "PERMANENT",
    jobDetail: { companyCode: "00004", businessLocation: "Subsidiary", costCenterName: "CRDB INSURANCE" },
  },
};
function fakeFetch(requested) {
  return async (url) => {
    requested.push(url);
    const body = url.startsWith(API_ROOT + "/open")
      ? { code: 1000, data: { content: summaries, last: true } }
      : { code: 1000, data: { details: details[url.split("/").pop()], documents: [] } };
    return { ok: true, status: 200, json: async () => body };
  };
}
test("CRDB collects only open public Tanzanian vacancies", async () => {
  const requested = [];
  const jobs = await collectCrdbJobs({ fetchFn: fakeFetch(requested) });
  assert.deepEqual(jobs.map((job) => job.sourceId).sort(), ["crdb-2434", "crdb-2446"]);
  assert.equal(requested.some((url) => /\/(2424|2429)$/.test(url)), false);
  const bank = jobs.find((job) => job.sourceId === "crdb-2434");
  assert.equal(bank.title, "Business Intelligence Digital Channel Specialist");
  assert.equal(bank.company, "CRDB Bank Plc");
  assert.equal(bank.location, "Dar es Salaam");
  assert.equal(bank.source, "crdb-bank-careers");
  assert.equal(bank.sourceUrl, CRDB_CAREERS_URL);
  assert.equal(bank.applicationUrl, CRDB_APPLY_URL);
  assert.equal(bank.deadline.toISOString(), "2099-10-14T23:59:59.000Z");
  assert.match(bank.description, /Job Purpose/);
  const insurance = jobs.find((job) => job.sourceId === "crdb-2446");
  assert.equal(insurance.company, "CRDB Insurance Company Limited");
  assert.equal(insurance.openings, 2);
});
test("CRDB fails on unexpected API response", async () => {
  await assert.rejects(
    collectCrdbJobs({ fetchFn: async () => ({ ok: true, json: async () => ({ code: 5000 }) }) }),
    /malformed/
  );
});
