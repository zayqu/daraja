const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isGenericVacancyTitle,
  mapAjiraVacancy,
} = require("../scraper/sources/ajira");
const { parseNmbCareers } = require("../scraper/sources/nmb");

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
  }

  assert.equal(isGenericVacancyTitle("Human Resources Officer"), false);
  assert.equal(mapAjiraVacancy(ajiraVacancy("Human Resources Officer")).title, "Human Resources Officer");
});

test("NMB official careers page produces named vacancies", () => {
  const jobs = parseNmbCareers(`
    <html><body>
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
  assert.equal(jobs[0].deadline.toISOString(), "2026-08-07T23:59:59.000Z");
  assert.match(jobs[0].sourceUrl, /^https:\/\/careers\.nmbbank\.co\.tz\//);
});
