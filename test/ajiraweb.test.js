const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractEmailApplicationJobs,
  extractCompany,
  extractDeadline,
  extractOfficialUrl,
  collectAjiraWebJobs,
  parseAjiraWebFeed,
} = require("../scraper/sources/ajiraweb");

test("AjiraWeb helpers find company, deadline and official link", () => {
  const article = "https://ajiraweb.com/example-job/";
  const html = `
    <p>Application Deadline: 31 December 2099</p>
    <a href="https://careers.example.co.tz/jobs/42">Apply here</a>
  `;
  assert.equal(extractCompany("ICT Officer at Example Bank"), "Example Bank");
  assert.equal(
    extractCompany("Multiple Job Opportunities at Abdulrahman Al-Sumait University – October 2026"),
    "Abdulrahman Al-Sumait University"
  );
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

test("an empty aggregator cycle is non-fatal and preserves existing records", async () => {
  const jobs = await collectAjiraWebJobs({
    fetchFn: async () => ({
      ok: true,
      text: async () => "<rss><channel></channel></rss>",
    }),
  });

  assert.deepEqual(jobs, []);
  assert.equal(jobs.health.preserveExisting, true);
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
  assert.doesNotMatch(jobs[0].description, /Application (?:method|deadline)/i);
  assert.doesNotMatch(jobs[0].description, /Organization:/i);
  assert.doesNotMatch(jobs[0].description, /Location:/i);
  assert.equal(
    jobs[0].sourceUrl,
    "https://ajiraweb.com/akiba-commercial-bank-plc-vacancies-2026/"
  );
  const applicationUrl = new URL(jobs[0].applicationUrl);
  assert.equal(applicationUrl.protocol, "mailto:");
  assert.equal(applicationUrl.pathname, "recruitment@acbbank.co.tz");
  assert.equal(applicationUrl.searchParams.get("subject"), "Application for Credit Analyst");
  assert.equal(applicationUrl.searchParams.get("body"), null);
});

test("Standard Bank vacancies use the direct SmartRecruiters application URL", async () => {
  const job = await require("../scraper/sources/ajiraweb").fetchStandardBankJob(
    "https://careers.standardbank.com/job-search-results/?jobID=744000075456789",
    async () => ({
      ok: true,
      json: async () => ({
        id: "744000075456789",
        active: true,
        name: "Finance Manager, Group Functions",
        location: { country: "tz", fullLocation: "Dar es Salaam, Tanzania" },
        typeOfEmployment: { label: "Full-time" },
        company: { identifier: "StandardBankGroup" },
        language: { code: "en-US" },
        applyUrl:
          "https://jobs.smartrecruiters.com/StandardBankGroup/744000075456789-finance-manager?oga=true",
        postingUrl:
          "https://jobs.smartrecruiters.com/StandardBankGroup/744000075456789-finance-manager",
        jobAd: {
          sections: {
            jobDescription: { text: "<p>Lead group finance activities.</p>" },
          },
        },
      }),
    })
  );

  assert.equal(job.title, "Finance Manager, Group Functions");
  assert.equal(
    job.sourceUrl,
    "https://jobs.smartrecruiters.com/StandardBankGroup/744000075456789-finance-manager"
  );
  assert.equal(
    job.applicationUrl,
    "https://jobs.smartrecruiters.com/StandardBankGroup/744000075456789-finance-manager?oga=true"
  );
});

test("email vacancies preserve the employer's required subject format", () => {
  const [job] = extractEmailApplicationJobs(
    "Example Bank Vacancies",
    "https://ajiraweb.com/example-bank-vacancies/",
    `
      <h3>1. Treasury Dealer</h3>
      <p>Manage money-market and foreign-exchange positions.</p>
      <p><strong>Email Subject:</strong> VACANCY APPLICATION - [Job Title]</p>
      <a href="mailto:careers@example.co.tz">Apply by email</a>
    `
  );

  assert.equal(
    new URL(job.applicationUrl).searchParams.get("subject"),
    "VACANCY APPLICATION - Treasury Dealer"
  );
});


test("multi-position email articles publish real roles instead of group headings", () => {
  const jobs = extractEmailApplicationJobs(
    "Multiple Job Opportunities at Abdulrahman Al-Sumait University – October 2026",
    "https://ajiraweb.com/multiple-job-opportunities-at-abdulrahman-al-sumait-university-october-2026/",
    `
      <h3>1. Administrative and Technical Professional Positions – 5 Posts</h3>
      <table>
        <thead><tr><th>Position</th><th>Posts</th><th>Minimum Qualification</th></tr></thead>
        <tbody>
          <tr><td>Deputy Vice-Chancellor – Administration, Finance & Planning</td><td>1</td><td>Professor/Associate Professor with PhD and relevant management experience</td></tr>
          <tr><td>Internal Auditor</td><td>1</td><td>CPA(T), ACCA, ACA or equivalent qualification with relevant experience</td></tr>
          <tr><td>University Bursar</td><td>1</td><td>Bachelor's degree in Accounting or Finance plus CPA(T)/ACCA</td></tr>
          <tr><td>Planning Officer</td><td>1</td><td>Bachelor's degree in Planning or related field</td></tr>
          <tr><td>Legal Counsel</td><td>1</td><td>Bachelor's degree in Law and relevant professional qualification</td></tr>
        </tbody>
      </table>
      <h3>2. Academic Positions</h3>
      <h4>Department of Social Studies – 4 Posts</h4>
      <p><strong>Assistant Lecturer/Lecturer – History</strong></p>
      <ul><li>Posts: 1</li><li>Qualification: MA/PhD in History</li></ul>
      <p><strong>Assistant Lecturer/Lecturer – Geography</strong></p>
      <ul><li>Posts: 3</li><li>Qualification: MA/PhD in Geography</li></ul>
      <p><strong>Application Deadline:</strong> 20 October 2026</p>
      <a href="mailto:recruitment@sumait.ac.tz">Apply by email</a>
    `
  );

  assert.equal(jobs.length, 7);
  assert.equal(jobs[0].company, "Abdulrahman Al-Sumait University");
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      "Deputy Vice-Chancellor – Administration, Finance & Planning",
      "Internal Auditor",
      "University Bursar",
      "Planning Officer",
      "Legal Counsel",
      "Assistant Lecturer/Lecturer – History",
      "Assistant Lecturer/Lecturer – Geography",
    ]
  );
  assert.ok(jobs.every((job) => !/Positions\s*[–—-]\s*\d+\s*Posts/i.test(job.title)));
  assert.equal(
    new URL(jobs[0].applicationUrl).searchParams.get("subject"),
    "Application for Deputy Vice-Chancellor – Administration, Finance & Planning"
  );
});
