const test = require("node:test");
const assert = require("node:assert/strict");

const { collectFrappeJobs, parseFrappeDetail, parseFrappeListing } = require("../scraper/sources/frappe-jobs");
const { collectedByEnabledSource, detectAts } = require("../scraper/lib/source-learning");

// Markup mirrors the server-rendered Frappe HR portal at
// pulse.phillipstanzania.co.tz (October 2026).
const LISTING = `<div class="row">
  <div class="mb-8 col-sm-6">
    <div id="jobs/phillips_distributors_limited/assistant-accountant" name="card" class="card border h-100 flex flex-col" role="button">
      <div class="p-6"><div class="flex mb-5"><div class="col-12 col-lg-9 px-0">
        <h4 class="mt-0 mb-1 jobs-page text-truncate" title="Assistant Accountant"> Assistant Accountant </h4>
        <div class="text-14"><span class="font-weight-bold">Phillips Distributors Limited</span><span class="text-secondary"> · 5 hours ago </span></div>
      </div><div class="col-3 px-0 flex d-none d-lg-flex"><div class="ml-auto font-weight-bold text-nowrap text-12"><div class="py-1 px-2 other-badge"> • Contract </div></div></div></div>
      <div class="text-14"><div class="mt-3 flex align-items-center"> Dar es Salaam </div><div class="mt-3 flex align-items-center"> Accounts &amp; Finance </div></div></div>
      <div class="px-4 py-2 job-card-footer mt-auto"><div class="row text-12 text-secondary">
        <p class="col-6 text-center mb-0 border-right">Applications received: <b>0</b></p>
        <p class="col-6 text-center mb-0">Closes on: <b>31 Oct, 2026</b></p>
      </div></div>
    </div>
  </div>
</div>`;

const DETAIL = `<div class="page_content"><div class="py-12">
  <div class="row"><div class="col-md-9 mb-8"><h1>Assistant Accountant</h1>
    <div><span class="font-weight-bold">Phillips Distributors Limited</span> · 4 hours ago</div></div>
    <div class="col-md-3 flex"><a class="btn btn-primary btn-lg" href="/job-application-3/new?job_title=HR-OPN-2026-0015">Apply Now</a></div></div>
  <div><div>Location</div><div>Dar es Salaam</div><div>Department</div><div>Accounts &amp; Finance</div>
    <div>Employment Type</div><div>Contract</div><div>Applications Received</div><div>0</div>
    <div>Closes On</div><div>31 Oct, 2026</div></div>
  <div><p>Job Title: Assistant Accountant</p><p>Reporting To: Finance Supervisor</p><p>Assist in recording daily financial transactions.</p></div>
</div></div>`;

const BASE = "https://pulse.phillipstanzania.co.tz";

test("Frappe listing cards give title, employer, location, type and closing date", () => {
  const [job] = parseFrappeListing(LISTING, `${BASE}/jobs`);
  assert.equal(job.title, "Assistant Accountant");
  assert.equal(job.company, "Phillips Distributors Limited");
  assert.equal(job.location, "Dar es Salaam");
  assert.equal(job.employmentType, "Contract");
  assert.equal(job.deadline, "31 Oct, 2026");
  assert.equal(job.detailUrl, `${BASE}/jobs/phillips_distributors_limited/assistant-accountant`);
});

test("Frappe detail keeps the description and the employer's own application form", () => {
  const detail = parseFrappeDetail(DETAIL, `${BASE}/jobs/phillips_distributors_limited/assistant-accountant`);
  assert.match(detail.description, /^Job Title: Assistant Accountant\nReporting To: Finance Supervisor/);
  assert.doesNotMatch(detail.description, /Closes On|Applications Received/);
  assert.equal(detail.applicationUrl, `${BASE}/job-application-3/new?job_title=HR-OPN-2026-0015`);
});

test("Frappe adapter collects official openings with a closing date", async () => {
  const pages = {
    [`${BASE}/jobs`]: LISTING,
    [`${BASE}/jobs/phillips_distributors_limited/assistant-accountant`]: DETAIL,
  };
  const fetchFn = async (url) => ({ ok: Boolean(pages[url]), status: pages[url] ? 200 : 404, text: async () => pages[url] || "" });
  const jobs = await collectFrappeJobs(
    { id: "phillips-distributors", name: "Phillips", url: `${BASE}/jobs`, employerName: "Phillips Distributors Limited" },
    { fetchFn }
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].source, "phillips-distributors");
  assert.equal(jobs[0].deadline.toISOString().slice(0, 10), "2026-10-31");
  assert.equal(jobs[0].reviewReasons, undefined);
  assert.match(jobs[0].applicationUrl, /job-application-3\/new/);
});

test("Frappe portals are recognised and Phillips leads count as already collected", () => {
  assert.equal(detectAts(`${BASE}/jobs/phillips_distributors_limited/assistant-accountant`).kind, "frappe-hrms");
  assert.equal(
    collectedByEnabledSource({ officialUrl: `${BASE}/jobs/phillips_distributors_limited/assistant-accountant` }).id,
    "phillips-distributors"
  );
});
