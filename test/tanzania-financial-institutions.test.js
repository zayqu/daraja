const test = require("node:test");
const assert = require("node:assert/strict");

const institutions = require("../scraper/config/tanzania-financial-institutions.json").institutions;
const {
  discoverCareerUrls,
  isGenericTitle,
  isOfficialUrl,
  parseJsonLdJobs,
  parseOfficialJobLinks,
} = require("../scraper/sources/tanzania-financial-institutions");

const institution = {
  id: "example-bank",
  name: "Example Bank Tanzania",
  url: "https://www.example.co.tz",
};

test("missing financial institution registry is unique and uses HTTPS", () => {
  assert.equal(new Set(institutions.map(({ id }) => id)).size, institutions.length);
  assert.equal(new Set(institutions.map(({ url }) => url)).size, institutions.length);
  assert.ok(institutions.length >= 20);
  for (const item of institutions) {
    assert.match(item.url, /^https:\/\//);
    assert.ok(item.name.length > 3);
  }
});

test("career discovery stays on the institution official domain", () => {
  const html = `
    <a href="/about">About</a>
    <a href="/careers">Careers</a>
    <a href="https://jobs.example.co.tz/openings">Current vacancies</a>
    <a href="https://fake.example.com/jobs">External jobs</a>
  `;
  const urls = discoverCareerUrls(html, institution.url);
  assert.deepEqual(urls, [
    "https://www.example.co.tz",
    "https://www.example.co.tz/careers",
    "https://jobs.example.co.tz/openings",
  ]);
  assert.equal(isOfficialUrl("https://jobs.example.co.tz/role/1", institution.url), true);
  assert.equal(isOfficialUrl("https://example.com/jobs", institution.url), false);
});

test("structured official vacancies are converted into publishable jobs", () => {
  const jobs = parseJsonLdJobs(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "identifier": { "value": "FIN-24" },
        "title": "Senior Credit Analyst",
        "description": "<p>Assess commercial credit applications.</p>",
        "datePosted": "2026-08-01",
        "validThrough": "2026-08-20T23:59:59+03:00",
        "hiringOrganization": { "name": "Example Bank Tanzania" },
        "jobLocation": {
          "address": {
            "addressLocality": "Dar es Salaam",
            "addressCountry": "TZ"
          }
        },
        "url": "https://jobs.example.co.tz/openings/fin-24"
      }
    </script>
  `, institution, "https://www.example.co.tz/careers");

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Senior Credit Analyst");
  assert.equal(jobs[0].company, "Example Bank Tanzania");
  assert.equal(jobs[0].location, "Dar es Salaam");
  assert.match(jobs[0].sourceUrl, /^https:\/\/jobs\.example\.co\.tz\//);
});

test("generic application labels and external links are never published", () => {
  assert.equal(isGenericTitle("Email Application"), true);
  assert.equal(isGenericTitle("Physical Application"), true);
  assert.equal(isGenericTitle("Apply Now"), true);

  const jobs = parseOfficialJobLinks(`
    <a href="/vacancies/senior-auditor">Senior Internal Auditor</a>
    <a href="https://malicious.example/jobs/1">Treasury Manager</a>
    <a href="/jobs/apply">Apply Now</a>
  `, institution, "https://www.example.co.tz/careers");

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Senior Internal Auditor");
  assert.equal(jobs[0].sourceUrl, "https://www.example.co.tz/vacancies/senior-auditor");
});
