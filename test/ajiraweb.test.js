const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractEmailApplicationJobs,
  extractCompany,
  extractDeadline,
  extractOfficialUrl,
  parseAjiraWebFeed,
} = require("../scraper/sources/ajiraweb");

test("AjiraWeb helpers find company, deadline and official link", () => {
  const article = "https://ajiraweb.com/example-job/";
  const html = `
    <p>Application Deadline: 31 December 2099</p>
    <a href="https://careers.example.co.tz/jobs/42">Apply here</a>
  `;
  assert.equal(extractCompany("ICT Officer at Example Bank"), "Example Bank");
  assert.equal(extractDeadline(html), "31 December 2099");
  assert.equal(extractOfficialUrl(html, article), "https://careers.example.co.tz/jobs/42");
});

test("AjiraWeb feed parser imports only official vacancy-level jobs", async () => {
  const xml = `<?xml version="1.0"?>
    <rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
      <item>
        <title>Software Engineer at Example Bank</title>
        <link>https://ajiraweb.com/software-engineer/</link>
        <guid>job-42</guid>
        <category>Jobs in Tanzania</category>
        <content:encoded><![CDATA[
          <p>Application Deadline: 31 December 2099</p>
          <a href="https://careers.example.co.tz/jobs/42">Apply</a>
        ]]></content:encoded>
      </item>
      <item>
        <title>Unrelated article</title>
        <link>https://ajiraweb.com/article/</link>
        <category>Education News</category>
      </item>
    </channel></rss>`;

  const fetchFn = async () => ({
    ok: true,
    headers: new Headers({ "content-type": "text/html" }),
    text: async () => `
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "identifier": {"value": "job-42"},
          "title": "Software Engineer",
          "description": "<p>Build secure banking applications.</p>",
          "employmentType": "FULL_TIME",
          "validThrough": "2099-12-31",
          "hiringOrganization": {"name": "Example Bank"},
          "jobLocation": {"address": {
            "addressLocality": "Dar es Salaam",
            "addressCountry": "Tanzania"
          }}
        }
      </script>`,
  });

  const jobs = await parseAjiraWebFeed(xml, { fetchFn });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "job-42");
  assert.equal(jobs[0].title, "Software Engineer");
  assert.equal(jobs[0].company, "Example Bank");
  assert.equal(jobs[0].category, "Technology");
  assert.equal(jobs[0].sourceUrl, "https://careers.example.co.tz/jobs/42");
  assert.match(jobs[0].description, /secure banking applications/);
});

test("company-level career pages without a real job posting are rejected", async () => {
  const xml = `<?xml version="1.0"?>
    <rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><item>
      <title>Example Bank Vacancies 2026</title>
      <link>https://ajiraweb.com/example-bank/</link>
      <category>Jobs in Tanzania</category>
      <content:encoded><![CDATA[
        <a href="https://careers.example.co.tz/search">Apply</a>
      ]]></content:encoded>
    </item></channel></rss>`;
  const fetchFn = async () => ({
    ok: true,
    headers: new Headers({ "content-type": "text/html" }),
    text: async () => "<html><title>Careers</title></html>",
  });

  assert.deepEqual(await parseAjiraWebFeed(xml, { fetchFn }), []);
});

test("email application articles are split into individual vacancies", () => {
  const jobs = extractEmailApplicationJobs(
    "Akiba Commercial Bank Plc Vacancies 2026",
    "https://ajiraweb.com/akiba-commercial-bank-plc-vacancies-2026/",
    `
      <h2>Available Vacancies</h2>
      <h3>1. Credit Analyst</h3>
      <p>The Credit Analyst assesses credit applications and financial risks.</p>
      <h3>2. Relationship Manager – Chinese Desk</h3>
      <p>The Relationship Manager grows relationships with Chinese-speaking clients.</p>
      <p><strong>Organization:</strong> Akiba Commercial Bank Plc (ACB Bank)</p>
      <p><strong>Location:</strong> Dar es Salaam, Tanzania</p>
      <p><strong>Application Deadline:</strong> 31 July 2099</p>
      <a href="mailto:recruitment@acbbank.co.tz">Apply by email</a>
    `
  );

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].title, "Credit Analyst");
  assert.equal(jobs[0].company, "Akiba Commercial Bank Plc (ACB Bank)");
  assert.equal(jobs[0].deadline, "31 July 2099");
  assert.match(jobs[0].description, /assesses credit applications/);
  assert.match(jobs[0].sourceUrl, /^mailto:recruitment@acbbank\.co\.tz/);
});
