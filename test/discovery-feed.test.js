const test = require("node:test");
const assert = require("node:assert/strict");

const {
  officialLinkFrom,
  parseDiscoveryFeed,
  parseDiscoveryLeads,
  roleTitle,
} = require("../scraper/sources/discovery-feed");
const {
  collectedByEnabledSource,
  detectAts,
  matchCatalogSource,
} = require("../scraper/lib/source-learning");

function item({ title, company, location = "Dar es salaam", content }) {
  return `<item>
    <title>${title}</title>
    <link>https://fursa.co.tz/job/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/</link>
    <content:encoded><![CDATA[${content}]]></content:encoded>
    <job_listing:location><![CDATA[${location}]]></job_listing:location>
    <job_listing:job_type><![CDATA[Full Time]]></job_listing:job_type>
    <job_listing:company><![CDATA[${company}]]></job_listing:company>
  </item>`;
}

const FEED = `<?xml version="1.0"?><rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:job_listing="https://wpjobmanager.com"><channel>
${item({
  title: "Fitter – Pump Job Vacancy at Barrick Mining Corporation, Shinyanga — October 2026",
  company: "Barrick Mining Corporation",
  location: "Shinyanga",
  content: '<p>Application Deadline: 14 October 2026</p><a href="https://ehkn.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/242531">CLICK/TAP HERE TO APPLY:</a>',
})}
${item({
  title: "Engineer Job Vacancy at Example Energy, Dar es Salaam — October 2026",
  company: "Example Energy",
  content: '<a href="https://boards.greenhouse.io/exampleenergy/jobs/12345">Apply here</a>',
})}
${item({
  title: "HR Intern Job Vacancy at Herocean Enterprises Tanzania Ltd, Dar es Salaam — October 2026",
  company: "Herocean Enterprises Tanzania Ltd",
  content: '<p>Send your CV to <a href="mailto:jobs@herocean.co.tz">jobs@herocean.co.tz</a>. Deadline: 20 October 2026</p><a href="https://herocean.co.tz/">herocean.co.tz</a>',
})}
${item({
  title: "Head, Ecosystem Job Vacancy at Stanbic Bank , Dar es Salaam October 2026",
  company: "Stanbic Bank",
  content: '<a href="https://jobs.smartrecruiters.com/StandardBankGroup/744000152859750-head-ecosystem">CLICK/TAP HERE TO APPLY:</a>',
})}
${item({
  title: "Updated Names Called for work / Kuitwa Kazini Utumishi / PSRS, October 2026",
  company: "PSRS",
  content: "<p>Names list</p>",
})}
</channel></rss>`;

const SOURCE = { id: "fursa-discovery", name: "Fursa", url: "https://fursa.co.tz/" };

function fakeFetch(routes) {
  return async (url) => {
    const body = routes[String(url)];
    if (body === undefined) return { ok: false, status: 404, headers: new Map(), json: async () => null, text: async () => "" };
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
}

test("role titles drop the board's 'Job Vacancy at Employer' suffix", () => {
  assert.equal(roleTitle("Fitter – Pump Job Vacancy at Barrick Mining Corporation, Shinyanga — October 2026"), "Fitter – Pump");
  assert.equal(roleTitle("Business Developers (2 Positions) at Onfon Microfinance, Dar es Salaam"), "Business Developers (2 Positions)");
  assert.equal(roleTitle("Urgent Hotel Job Vacancies (5 positions) at Serene Beach Resort"), "Hotel Job Vacancies (5 positions)");
});

test("official links prefer applicant systems and ignore homepages", () => {
  const board = "https://fursa.co.tz/job/x/";
  assert.match(
    officialLinkFrom('<a href="https://acme.co.tz/">acme</a><a href="https://jobs.lever.co/acme/1">Apply</a>', board),
    /jobs\.lever\.co/
  );
  assert.equal(officialLinkFrom('<a href="https://acme.co.tz/">acme.co.tz</a>', board), null);
  assert.equal(officialLinkFrom('<a href="https://fursa.co.tz/other">more</a>', board), null);
});

test("feed parsing skips non-vacancy posts and keeps employer metadata", () => {
  const leads = parseDiscoveryFeed(FEED);
  assert.equal(leads.length, 4);
  assert.equal(leads[0].employer, "Barrick Mining Corporation");
  assert.equal(leads[0].location, "Shinyanga");
  assert.equal(leads[0].deadline, "14 October 2026");
  assert.equal(leads[2].officialUrl, null);
  assert.equal(leads[2].email, "mailto:jobs@herocean.co.tz");
});

test("applicant systems are recognised", () => {
  assert.equal(detectAts("https://ehkn.fa.ca2.oraclecloud.com/hcmUI/x").kind, "oracle-hcm");
  assert.equal(detectAts("https://jobs.smartrecruiters.com/X/1").api, true);
  assert.equal(detectAts("https://acme.co.tz/careers"), null);
});

test("leads verified on the employer's system publish; others are held for review", async () => {
  const fetchFn = fakeFetch({
    "https://boards-api.greenhouse.io/v1/boards/exampleenergy/jobs/12345": {
      id: 12345,
      title: "Engineer",
      company_name: "Example Energy",
      location: { name: "Dar es Salaam, Tanzania" },
      content: "&lt;p&gt;Build things&lt;/p&gt;",
      absolute_url: "https://boards.greenhouse.io/exampleenergy/jobs/12345",
    },
  });
  const jobs = await parseDiscoveryLeads(parseDiscoveryFeed(FEED), SOURCE, { fetchFn });

  const engineer = jobs.find((job) => job.title === "Engineer");
  assert.ok(engineer, "greenhouse-verified job is collected");
  assert.equal(engineer.reviewReasons, undefined);
  assert.equal(engineer.company, "Example Energy");

  const fitter = jobs.find((job) => job.title === "Fitter – Pump");
  assert.match(fitter.reviewReasons[0], /could not be verified/);
  assert.match(fitter.applicationUrl, /oraclecloud\.com/);

  const intern = jobs.find((job) => job.title === "HR Intern");
  assert.equal(intern.applicationUrl, "mailto:jobs@herocean.co.tz");
  assert.ok(intern.reviewReasons.length);

  // Stanbic's SmartRecruiters board is already collected by an enabled source.
  assert.equal(jobs.some((job) => /Ecosystem/.test(job.title)), false);

  const { learning, verified, held } = jobs.health;
  assert.equal(verified, 1);
  assert.equal(held, 2);
  const barrick = learning.suggested.find((row) => row.employer === "Barrick Mining Corporation");
  assert.deepEqual(barrick.ats, ["oracle-hcm"]);
});

test("catalog matching uses names and enabled source URLs", () => {
  const sources = [
    { id: "equity-tz", name: "Equity Bank Tanzania Careers", url: "https://equitygroupholdings.com/tz/careers", enabled: false },
    { id: "standardbank-tanzania", name: "Stanbic", url: "https://jobs.smartrecruiters.com/StandardBankGroup", enabled: true },
  ];
  assert.equal(matchCatalogSource({ employer: "Equity Bank" }, sources).id, "equity-tz");
  assert.equal(matchCatalogSource({ employer: "Bank" }, sources), null);
  assert.equal(
    collectedByEnabledSource({ officialUrl: "https://jobs.smartrecruiters.com/StandardBankGroup/744-x" }, sources).id,
    "standardbank-tanzania"
  );
  assert.equal(collectedByEnabledSource({ officialUrl: "https://jobs.smartrecruiters.com/Other/1" }, sources), null);
});
