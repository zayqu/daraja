const test = require("node:test");
const assert = require("node:assert/strict");

const {
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

test("AjiraWeb feed parser imports only Tanzania jobs", () => {
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

  const jobs = parseAjiraWebFeed(xml);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "job-42");
  assert.equal(jobs[0].category, "Technology");
  assert.equal(jobs[0].sourceUrl, "https://careers.example.co.tz/jobs/42");
});
