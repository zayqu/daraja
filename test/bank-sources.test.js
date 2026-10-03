const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isGenericVacancyTitle,
  mapAjiraVacancy,
  mapRenderedVacancy,
} = require("../scraper/sources/ajira");
const {
  NMB_CAREERS_URL,
  NMB_CORPORATE_URL,
  collectNmbJobs,
  parseNmbCareers,
} = require("../scraper/sources/nmb");

function ajiraVacancy(codeNo) {
  return {
    id: 123,
    scheme: { codeNo, emp: { name: "Survival Hospital" } },
    closeDate: "2026-08-31",
    noOfPost: 2,
  };
}

test("application methods are never published as vacancy titles", () => {
  for (const value of [
    "Email Application",
    "Physical Application",
    "Online Application",
    "How to Apply",
    "Apply Now",
  ]) {
    assert.equal(isGenericVacancyTitle(value), true);
    assert.equal(mapAjiraVacancy(ajiraVacancy(value)), null);
    assert.equal(mapRenderedVacancy({ title: value }), null);
  }

  assert.equal(isGenericVacancyTitle("Human Resources Officer"), false);
  assert.equal(
    mapAjiraVacancy(ajiraVacancy("Human Resources Officer")).title,
    "Human Resources Officer"
  );
});

test("Ajira rendered Advert Name becomes the published job title", () => {
  const job = mapRenderedVacancy({
    title: "Assistant Nursing Officer II",
    company: "Survival Hospital",
    deadline: "31/08/2026",
    numberOfPosts: "2 Posts",
    sourceUrl:
      "https://portal.ajira.go.tz/view-advert/KJH60YKjK4b7oTN3jj8hDA%3D%3D",
  });

  assert.equal(job.title, "Assistant Nursing Officer II");
  assert.equal(job.company, "Survival Hospital");
  assert.equal(job.deadline, "31/08/2026");
  assert.equal(job.numberOfPosts, "2 Posts");
  assert.equal(job.sourceId, "13243");
  assert.equal(job.applicationUrl, "https://portal.ajira.go.tz/auth");
});

test("NMB official careers page produces named vacancies", () => {
  const jobs = parseNmbCareers(`
    <html><body>
      <img class="brand-logo" data-src="/assets/nmb-logo.svg" alt="NMB Bank logo">
      <h3>Client Analyst; Commercial - Origination (1 Position(s))</h3>
      <p>Job Location : Head Office, HQ</p>
      <p>Job Purpose: Evaluate and manage counterparty credit risk.</p>
      <p>Job closing date : 07-Aug-2026</p>
      <a href="/nmb_career/login.aspx">Login to Apply</a>
    </body></html>
  `);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Client Analyst; Commercial - Origination");
  assert.equal(jobs[0].company, "NMB Bank Plc");
  assert.equal(jobs[0].source, "nmb-bank-careers");
  assert.equal(jobs[0].deadline.toISOString(), "2026-08-07T23:59:59.000Z");
  assert.equal(
    jobs[0].sourceUrl,
    "https://careers.nmbbank.co.tz/nmb_career/career.aspx"
  );
  assert.equal(
    jobs[0].applicationUrl,
    "https://careers.nmbbank.co.tz/nmb_career/login.aspx"
  );
  assert.equal(
    jobs[0].companyLogo,
    "https://careers.nmbbank.co.tz/assets/nmb-logo.svg"
  );
});

test("NMB falls back to the official corporate site when careers markup has no logo", async () => {
  const careersHtml = `
    <html><body>
      <h3>Relationship Manager (1 Position(s))</h3>
      <p>Job Location : Dar es Salaam</p>
      <p>Job closing date : 31-Dec-2099</p>
      <a href="/nmb_career/login.aspx">Login to Apply</a>
    </body></html>
  `;

  const jobs = await collectNmbJobs({
    fetchFn: async (url) => {
      if (url === NMB_CAREERS_URL) {
        return {
          ok: true,
          status: 200,
          text: async () => careersHtml,
        };
      }
      if (url === NMB_CORPORATE_URL) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () =>
            '<header><img class="site-logo" src="/media/nmb-official.svg" alt="NMB Bank logo"></header>',
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  assert.equal(jobs.length, 1);
  assert.equal(
    jobs[0].companyLogo,
    "https://www.nmbbank.co.tz/media/nmb-official.svg"
  );
});
