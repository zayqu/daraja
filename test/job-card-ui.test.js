const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("public job results use one shared hierarchy-first job card", async () => {
  const jobsPage = await readFile(
    path.join(__dirname, "..", "app", "jobs", "JobsPageClient.js"),
    "utf8"
  );
  const card = await readFile(
    path.join(__dirname, "..", "components", "ui", "JobCard.js"),
    "utf8"
  );
  const styles = await readFile(
    path.join(__dirname, "..", "components", "ui", "JobCard.module.css"),
    "utf8"
  );

  assert.match(jobsPage, /import JobCard from "@\/components\/ui\/JobCard"/);
  assert.match(jobsPage, /<JobCard[\s\S]*listName="Job search results"/);
  assert.doesNotMatch(jobsPage, /className="job-card"/);
  assert.doesNotMatch(jobsPage, /JobBrandMedia/);

  assert.match(card, /<h3 className=\{styles\.title\}>\{job\.title\}<\/h3>/);
  assert.match(card, /className=\{styles\.company\}>\{job\.company\}/);
  assert.match(card, /className=\{styles\.location\}>\{job\.location\}/);
  assert.match(card, /className=\{styles\.tags\}/);
  assert.match(card, /styles\.deadline/);
  assert.match(card, /JobBrandMedia/);
  assert.match(card, /JOB_TYPE_LABELS/);
  assert.match(card, /job\.category/);
  assert.doesNotMatch(card, /experience/i);

  assert.match(
    styles,
    /grid-template-columns:\s*52px minmax\(0, 1fr\) auto/
  );
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*grid-template-columns:\s*44px minmax\(0, 1fr\)/
  );
});
