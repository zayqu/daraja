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
  assert.match(card, /Deadline:/);
  assert.match(card, /styles\.deadline/);
  assert.match(card, /styles\.saveVisual/);
  assert.match(card, /styles\.calendarIcon/);
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
    /@media \(max-width: 640px\)[\s\S]*grid-template-columns:\s*40px minmax\(0, 1fr\) auto/
  );
  assert.match(
    styles,
    /grid-template-areas:[\s\S]*"brand title save"[\s\S]*"brand company location"[\s\S]*"tags tags deadline"/
  );
  assert.doesNotMatch(card, /mobileCompanyBrand/);
  assert.doesNotMatch(styles, /mobileCompanyBrand/);
  assert.match(
    styles,
    /\.brand[\s\S]*grid-area:\s*brand[\s\S]*align-self:\s*center/
  );
  assert.match(styles, /\.location[\s\S]*justify-self:\s*end/);
  assert.match(styles, /\.deadline[\s\S]*justify-self:\s*end/);
  assert.match(styles, /\.company[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(styles, /\.posted[\s\S]*display:\s*none/);
});
