const test = require("node:test");
const assert = require("node:assert/strict");

const {
  API_ROOT,
  collectStandardBankJobs,
  htmlToText,
  mapPosting,
} = require("../scraper/sources/standardbank");
const { getCandidateSources } = require("../scraper/lib/store");

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const summary = {
  id: "744000139270099",
  name: "Finance Manager, Group Functions",
  location: { country: "tz", city: "Dar es Salaam" },
};

const detail = {
  ...summary,
  active: true,
  typeOfEmployment: { label: "Full-time" },
  language: { code: "en" },
  customField: [
    { fieldLabel: "Company Code", valueLabel: "Stanbic Bank Tanzania" },
  ],
  applyUrl:
    "https://jobs.smartrecruiters.com/StandardBankGroup/744000139270099-finance-manager-group-functions?oga=true",
  jobAd: {
    sections: {
      jobDescription: { text: "<p>Lead group finance reporting.</p>" },
      qualifications: {
        text: "<ul><li>Qualified accountant</li><li>Leadership experience</li></ul>",
      },
    },
  },
};

test("imports Tanzania vacancies with the exact official application destination", async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === `${API_ROOT}?limit=100&offset=0`) {
      return response({
        totalFound: 2,
        content: [
          summary,
          {
            id: "kenya-role",
            name: "Kenya role",
            location: { country: "ke", city: "Nairobi" },
          },
        ],
      });
    }
    if (url === `${API_ROOT}/${summary.id}`) return response(detail);
    throw new Error(`Unexpected request: ${url}`);
  };

  const jobs = await collectStandardBankJobs({ fetchFn });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Finance Manager, Group Functions");
  assert.equal(jobs[0].company, "Stanbic Bank Tanzania");
  assert.equal(jobs[0].location, "Dar es Salaam");
  assert.equal(jobs[0].category, "Banking & Finance");
  assert.match(jobs[0].description, /Qualified accountant/);
  assert.equal(jobs[0].sourceUrl, detail.applyUrl);
  assert.equal(jobs[0].sourceId, `standardbank-${summary.id}`);
  assert.equal(calls.length, 2);
});

test("an empty verified Tanzania feed is healthy", async () => {
  const jobs = await collectStandardBankJobs({
    fetchFn: async () =>
      response({
        totalFound: 1,
        content: [
          {
            id: "south-africa-role",
            name: "South Africa role",
            location: { country: "za" },
          },
        ],
      }),
  });
  assert.deepEqual(jobs, []);
});

test("rejects inactive jobs and non-official application destinations", () => {
  assert.equal(mapPosting({ ...detail, active: false }), null);
  assert.equal(
    mapPosting({ ...detail, applyUrl: "https://example.com/apply" }),
    null
  );
});

test("converts official HTML descriptions into readable paragraphs", () => {
  assert.equal(
    htmlToText("<p>Purpose</p><ul><li>First duty</li><li>Second duty</li></ul>"),
    "Purpose\n\n• First duty\n\n• Second duty"
  );
});

test("fails visibly when the official API is unavailable", async () => {
  await assert.rejects(
    () =>
      collectStandardBankJobs({
        fetchFn: async () => response({}, 503),
      }),
    /HTTP 503/
  );
});

test("official imports replace matching aggregator records instead of duplicating them", () => {
  assert.deepEqual(getCandidateSources("standardbank-tanzania"), {
    in: ["standardbank-tanzania", "ajiraweb"],
  });
  assert.equal(getCandidateSources("ajira"), "ajira");
});
